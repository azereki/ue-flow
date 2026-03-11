/**
 * AI Command Protocol — parses and executes structured commands from AI responses.
 *
 * The AI can return a JSON block with incremental graph modification commands
 * instead of generating a complete UEGraphJSON. Commands use nodeTitle for
 * identification (since the AI sees titles in the graph context, not internal IDs).
 */
import type { GraphAPI, GraphCommand, CommandResult, BatchResult } from './graph-api';
import type { AnyFlowNode, BlueprintFlowNode } from '../types/flow-types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AICommand {
  action: string;
  params: Record<string, unknown>;
}

export interface AICommandResponse {
  commands: AICommand[];
  explanation?: string;
}

export interface CommandExecResult {
  command: AICommand;
  result: CommandResult;
  resolvedDescription: string;
}

export interface AICommandBatchResult {
  results: CommandExecResult[];
  allSucceeded: boolean;
  explanation?: string;
}

// ─── Detection ────────────────────────────────────────────────────────────────

/** Command signals — modification language that triggers command mode. */
const COMMAND_SIGNALS = [
  'delete the', 'remove the', 'delete node', 'remove node',
  'connect', 'wire', 'disconnect', 'unwire',
  'rename', 'change the name', 'set the name',
  'move the', 'reposition',
  'set the value', 'change the value', 'set value', 'change value',
  'set pin', 'change pin',
  'add a node', 'add node', 'insert a node', 'insert node',
  'duplicate the', 'copy the', 'clone the',
  'annotate', 'add a note', 'add note', 'add a comment', 'add comment',
  'move the node', 'move node', 'move it',
];

/** Heuristic: does the user message look like a command request? */
export function isCommandRequest(msg: string): boolean {
  const lower = msg.toLowerCase().trim();
  return COMMAND_SIGNALS.some((s) => lower.includes(s));
}

// ─── Prompt Addendum ──────────────────────────────────────────────────────────

export const COMMAND_SCHEMA_ADDENDUM = `
<command-instructions>
When the user asks to modify the current graph (delete, connect, rename, move, etc.), respond with a JSON command block inside \`\`\`json\`\`\` tags. Do NOT generate a full UEGraphJSON — use commands for incremental modifications.

## Command Format
\`\`\`json
{
  "commands": [
    {"action": "actionName", "params": { ... }}
  ],
  "explanation": "Brief description of what was done."
}
\`\`\`

## Available Actions

### deleteNode
Delete a node and all its connections.
\`{"action": "deleteNode", "params": {"nodeTitle": "Print String"}}\`

### deleteEdge
Delete a connection between two pins.
\`{"action": "deleteEdge", "params": {"sourceTitle": "Event BeginPlay", "sourcePin": "then", "targetTitle": "Delay", "targetPin": "execute"}}\`

### addEdge
Create a connection between two pins.
\`{"action": "addEdge", "params": {"sourceTitle": "Event BeginPlay", "sourcePin": "then", "targetTitle": "Delay", "targetPin": "execute"}}\`

### addNode
Add a new node by function name (looked up in the signature database).
\`{"action": "addNode", "params": {"memberName": "PrintString", "position": {"x": 400, "y": 200}}}\`

### setPinValue
Set a pin's default value.
\`{"action": "setPinValue", "params": {"nodeTitle": "Delay", "pinName": "Duration", "value": "2.0"}}\`

### setNodeTitle
Rename a node.
\`{"action": "setNodeTitle", "params": {"nodeTitle": "Print String", "newTitle": "Debug Print"}}\`

### duplicateNode
Duplicate a node.
\`{"action": "duplicateNode", "params": {"nodeTitle": "Print String"}}\`

### annotateNode
Add a note/annotation to a node.
\`{"action": "annotateNode", "params": {"nodeTitle": "Print String", "text": "Debug only"}}\`

### moveNode
Move a node to a new position.
\`{"action": "moveNode", "params": {"nodeTitle": "Print String", "x": 500, "y": 300}}\`

### addComment
Add a comment block to the graph.
\`{"action": "addComment", "params": {"text": "Main logic", "position": {"x": 0, "y": -100}, "width": 400, "height": 200}}\`

## Rules
1. Use \`nodeTitle\` to identify nodes — these match the titles shown in the graph.
2. Pin names are the display names (e.g., "then", "execute", "In String", "Duration").
3. When wiring nodes, ensure pin directions are compatible (output → input).
4. Multiple commands execute as an atomic batch (single undo).
5. For adding nodes, use \`memberName\` from UE function names (e.g., "PrintString", "Delay", "K2_DestroyActor").
6. If the user asks for a complete new graph (not modifying existing), use the full UEGraphJSON generation format instead of commands.
</command-instructions>`;

// ─── Parsing ──────────────────────────────────────────────────────────────────

/** Parse AI command JSON from a response text. Returns null if no command block found. */
export function parseAICommands(aiResponse: string): AICommandResponse | null {
  const jsonMatch = aiResponse.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
  if (!jsonMatch) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== 'object') return null;

  // Distinguish from UEGraphJSON: commands have a "commands" array, UEGraphJSON has "nodes"
  if (!Array.isArray(obj.commands)) return null;
  if (Array.isArray(obj.nodes)) return null; // This is a UEGraphJSON, not commands

  const commands: AICommand[] = [];
  for (const raw of obj.commands as unknown[]) {
    const cmd = raw as Record<string, unknown>;
    if (!cmd.action || typeof cmd.action !== 'string') continue;
    commands.push({
      action: String(cmd.action),
      params: (cmd.params as Record<string, unknown>) ?? {},
    });
  }

  if (commands.length === 0) return null;

  return {
    commands,
    explanation: typeof obj.explanation === 'string' ? obj.explanation : undefined,
  };
}

// ─── Resolution & Execution ───────────────────────────────────────────────────

/** Resolve a nodeTitle to a node ID. Returns the first match. */
function resolveNodeByTitle(api: GraphAPI, title: string): AnyFlowNode | undefined {
  const matches = api.findNodesByTitle(title);
  if (matches.length === 0) return undefined;
  // Prefer exact match
  const exact = matches.find((n) => {
    const nodeTitle = n.type === 'blueprintNode'
      ? (n as BlueprintFlowNode).data.title
      : (n as { data: { title: string } }).data.title;
    return nodeTitle.toLowerCase() === title.toLowerCase();
  });
  return exact ?? matches[0];
}

/** Execute a batch of AI commands against the GraphAPI. */
export function executeAICommands(api: GraphAPI, cmdResponse: AICommandResponse): AICommandBatchResult {
  // Build GraphCommand array by resolving titles to IDs
  const execResults: CommandExecResult[] = [];

  // Capture a single snapshot for the entire batch
  api.captureSnapshot('AI commands');

  for (const cmd of cmdResponse.commands) {
    const result = executeSingleCommand(api, cmd);
    execResults.push(result);
  }

  return {
    results: execResults,
    allSucceeded: execResults.every((r) => r.result.success),
    explanation: cmdResponse.explanation,
  };
}

function executeSingleCommand(api: GraphAPI, cmd: AICommand): CommandExecResult {
  const p = cmd.params;

  switch (cmd.action) {
    case 'deleteNode': {
      const title = String(p.nodeTitle ?? '');
      const node = resolveNodeByTitle(api, title);
      if (!node) return { command: cmd, result: { success: false, error: `Node "${title}" not found` }, resolvedDescription: `Delete "${title}"` };
      // Use internal delete without capturing another snapshot
      return { command: cmd, result: api.deleteNodes([node.id]), resolvedDescription: `Deleted "${title}"` };
    }

    case 'deleteEdge': {
      const srcTitle = String(p.sourceTitle ?? '');
      const tgtTitle = String(p.targetTitle ?? '');
      const srcPin = String(p.sourcePin ?? '');
      const tgtPin = String(p.targetPin ?? '');
      const srcNode = resolveNodeByTitle(api, srcTitle);
      const tgtNode = resolveNodeByTitle(api, tgtTitle);
      if (!srcNode || !tgtNode) {
        return { command: cmd, result: { success: false, error: `Node not found: ${!srcNode ? srcTitle : tgtTitle}` }, resolvedDescription: `Delete edge ${srcTitle} → ${tgtTitle}` };
      }
      const desc = `Delete edge ${srcTitle}.${srcPin} → ${tgtTitle}.${tgtPin}`;
      const edge = api.findEdgeByPins(srcNode.id, srcPin, tgtNode.id, tgtPin);
      if (!edge) return { command: cmd, result: { success: false, error: `No connection found: ${srcTitle}.${srcPin} → ${tgtTitle}.${tgtPin}` }, resolvedDescription: desc };
      return { command: cmd, result: api.deleteEdges([edge.id]), resolvedDescription: `Deleted edge ${srcTitle}.${srcPin} → ${tgtTitle}.${tgtPin}` };
    }

    case 'addEdge': {
      const srcTitle = String(p.sourceTitle ?? '');
      const tgtTitle = String(p.targetTitle ?? '');
      const srcPin = String(p.sourcePin ?? '');
      const tgtPin = String(p.targetPin ?? '');
      const srcNode = resolveNodeByTitle(api, srcTitle);
      const tgtNode = resolveNodeByTitle(api, tgtTitle);
      if (!srcNode || !tgtNode) {
        const missing = !srcNode ? srcTitle : tgtTitle;
        return { command: cmd, result: { success: false, error: `Node "${missing}" not found` }, resolvedDescription: `Connect ${srcTitle} → ${tgtTitle}` };
      }
      const result = api.addEdge(srcNode.id, srcPin, tgtNode.id, tgtPin);
      return { command: cmd, result, resolvedDescription: `Connected ${srcTitle}.${srcPin} → ${tgtTitle}.${tgtPin}` };
    }

    case 'addNode': {
      const memberName = String(p.memberName ?? '');
      const pos = p.position as { x?: number; y?: number } | undefined;
      const position = { x: Number(pos?.x ?? 0), y: Number(pos?.y ?? 0) };
      const result = api.addNodeFromSignature(memberName, position);
      return { command: cmd, result, resolvedDescription: `Added node "${memberName}"` };
    }

    case 'setPinValue': {
      const title = String(p.nodeTitle ?? '');
      const pinName = String(p.pinName ?? '');
      const value = String(p.value ?? '');
      const node = resolveNodeByTitle(api, title);
      if (!node) return { command: cmd, result: { success: false, error: `Node "${title}" not found` }, resolvedDescription: `Set ${title}.${pinName} = ${value}` };
      const result = api.setPinValue(node.id, pinName, value);
      return { command: cmd, result, resolvedDescription: `Set ${title}.${pinName} = "${value}"` };
    }

    case 'setNodeTitle': {
      const title = String(p.nodeTitle ?? '');
      const newTitle = String(p.newTitle ?? '');
      const node = resolveNodeByTitle(api, title);
      if (!node) return { command: cmd, result: { success: false, error: `Node "${title}" not found` }, resolvedDescription: `Rename "${title}" → "${newTitle}"` };
      const result = api.setNodeTitle(node.id, newTitle);
      return { command: cmd, result, resolvedDescription: `Renamed "${title}" → "${newTitle}"` };
    }

    case 'duplicateNode': {
      const title = String(p.nodeTitle ?? '');
      const node = resolveNodeByTitle(api, title);
      if (!node) return { command: cmd, result: { success: false, error: `Node "${title}" not found` }, resolvedDescription: `Duplicate "${title}"` };
      const result = api.duplicateNodes([node.id]);
      return { command: cmd, result, resolvedDescription: `Duplicated "${title}"` };
    }

    case 'annotateNode': {
      const title = String(p.nodeTitle ?? '');
      const text = String(p.text ?? '');
      const node = resolveNodeByTitle(api, title);
      if (!node) return { command: cmd, result: { success: false, error: `Node "${title}" not found` }, resolvedDescription: `Annotate "${title}"` };
      const result = api.setNodeAnnotation(node.id, text);
      return { command: cmd, result, resolvedDescription: `Annotated "${title}": "${text}"` };
    }

    case 'moveNode': {
      const title = String(p.nodeTitle ?? '');
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const node = resolveNodeByTitle(api, title);
      if (!node) return { command: cmd, result: { success: false, error: `Node "${title}" not found` }, resolvedDescription: `Move "${title}"` };
      const result = api.moveNodes([{ nodeId: node.id, position: { x, y } }]);
      return { command: cmd, result, resolvedDescription: `Moved "${title}" to (${x}, ${y})` };
    }

    case 'addComment': {
      const text = String(p.text ?? 'Comment');
      const pos = p.position as { x?: number; y?: number } | undefined;
      const position = { x: Number(pos?.x ?? 0), y: Number(pos?.y ?? 0) };
      const width = Number(p.width ?? 400);
      const height = Number(p.height ?? 200);
      const result = api.addNode({
        nodeClass: 'EdGraphNode_Comment',
        title: text,
        position,
        type: 'comment',
        width,
        height,
      });
      return { command: cmd, result, resolvedDescription: `Added comment: "${text}"` };
    }

    default:
      return { command: cmd, result: { success: false, error: `Unknown action: ${cmd.action}` }, resolvedDescription: `Unknown: ${cmd.action}` };
  }
}
