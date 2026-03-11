import type { UEGraphJSON, UEPin, UENode, UEEdge } from '../types/ue-graph';
import type { PinCategory } from '../types/pin-types';
import { synthesizeNodePropertiesWithDB } from './ue-references';
import { validateGeneratedGraph } from './graph-validator';

const VALID_NODE_TYPES = new Set([
  'event', 'call_function', 'variable_get', 'variable_set',
  'flow_control', 'cast', 'comment', 'reroute',
]);

const VALID_PIN_CATEGORIES = new Set<PinCategory>([
  'exec', 'bool', 'real', 'int', 'byte', 'string', 'name', 'text',
  'object', 'struct', 'enum', 'wildcard', 'float', 'class', 'interface',
  'delegate', 'softclass', 'softobject',
]);

/** Generation schema addendum — appended to system prompt only for generation requests. */
export const GENERATE_SCHEMA_ADDENDUM = `
<generation-instructions>
If the user asks you to generate, create, or build Blueprint nodes, output a valid UEGraphJSON as a \`\`\`json\`\`\` code block following the schema below. Otherwise, answer their question analytically.
</generation-instructions>

<grounding>
The schema below is the absolute source of truth. Do not invent fields, node classes, or pin categories beyond what is listed.
</grounding>

## UEGraphJSON Schema

\`\`\`
{
  "metadata": { "title": "string", "assetPath": "string" },
  "nodes": [UENode],
  "edges": [UEEdge]
}
\`\`\`

## UENode
\`{ id, type, nodeClass, nodeGuid, position: {x, y}, title, properties: {}, pins: [UEPin] }\`
- Valid \`type\` values: \`event\`, \`call_function\`, \`variable_get\`, \`variable_set\`, \`flow_control\`, \`cast\`, \`comment\`
- Common nodeClass values: \`K2Node_Event\`, \`K2Node_CustomEvent\`, \`K2Node_CallFunction\`, \`K2Node_IfThenElse\`, \`K2Node_VariableGet\`, \`K2Node_VariableSet\`, \`K2Node_DynamicCast\`, \`K2Node_ForEachLoop\`, \`K2Node_MacroInstance\`, \`K2Node_ExecutionSequence\`, \`K2Node_DoOnce\`, \`K2Node_Gate\`, \`K2Node_FlipFlop\`, \`K2Node_MultiGate\`, \`K2Node_Delay\`, \`K2Node_Timeline\`, \`K2Node_SpawnActorFromClass\`, \`K2Node_Self\`, \`K2Node_CallDelegate\`, \`K2Node_AddDelegate\`, \`K2Node_RemoveDelegate\`, \`K2Node_ComponentBoundEvent\`, \`K2Node_EnhancedInputAction\`, \`EdGraphNode_Comment\`
- nodeGuid: unique 32-char hex string per node (0-9, A-F only, e.g. "A000B000C000D000E000F00011112222")

## Required Properties (critical for UE paste accuracy)
- **K2Node_Event** MUST have \`EventReference\` and \`bOverrideFunction\`:
  \`"properties": { "EventReference": "(MemberParent=\\"/Script/Engine.Actor\\",MemberName=\\"ReceiveBeginPlay\\")", "bOverrideFunction": "True" }\`
- **K2Node_CallFunction** MUST have \`FunctionReference\`:
  \`"properties": { "FunctionReference": "(MemberParent=\\"/Script/Engine.KismetSystemLibrary\\",MemberName=\\"PrintString\\")" }\`
- **K2Node_VariableGet/Set** MUST have \`VariableReference\`:
  \`"properties": { "VariableReference": "(MemberName=\\"VarName\\",bSelfContext=True)" }\`
- **K2Node_IfThenElse** (Branch) needs no special properties: \`"properties": {}\`
  - Branch output pins MUST use \`name: "then"\` (true path) and \`name: "else"\` (false path) — NOT "True"/"False"
- For custom/self functions, use \`MemberParent="Self"\`

## UEPin
\`{ id, name, direction: "input"|"output", category }\`
- Optional: \`defaultValue\`, \`subType\`
- Valid \`category\` values: \`exec\`, \`bool\`, \`real\`, \`int\`, \`byte\`, \`string\`, \`name\`, \`text\`, \`object\`, \`struct\`, \`enum\`, \`wildcard\`

## UEEdge
\`{ id, source, sourcePin, target, targetPin, category }\`
- \`source\`/\`target\` are node IDs; \`sourcePin\`/\`targetPin\` are pin names
- \`category\` matches the pin type being connected

## Layout Guidelines
- ~280px horizontal spacing between sequential nodes
- ~160px vertical offset for branches
- Events start at x:0, y:0

## Few-Shot Examples

### Example 1: Simple linear (BeginPlay → PrintString)

User: "Print hello when the game starts"

\`\`\`json
{
  "metadata": { "title": "EventGraph", "assetPath": "/Game/BP_Generated" },
  "nodes": [
    {
      "id": "Event_BeginPlay", "type": "event", "nodeClass": "K2Node_Event",
      "nodeGuid": "A000B000C000D000E000F00011112222", "position": { "x": 0, "y": 0 },
      "title": "Event BeginPlay",
      "properties": { "EventReference": "(MemberParent=\\"/Script/Engine.Actor\\",MemberName=\\"ReceiveBeginPlay\\")", "bOverrideFunction": "True" },
      "pins": [{ "id": "bp-then", "name": "then", "direction": "output", "category": "exec" }]
    },
    {
      "id": "PrintString", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "A100B100C100D100E100F10011112222", "position": { "x": 280, "y": 0 },
      "title": "Print String",
      "properties": { "FunctionReference": "(MemberParent=\\"/Script/Engine.KismetSystemLibrary\\",MemberName=\\"PrintString\\")" },
      "pins": [
        { "id": "ps-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "ps-then", "name": "then", "direction": "output", "category": "exec" },
        { "id": "ps-str", "name": "In String", "direction": "input", "category": "string", "defaultValue": "Hello" }
      ]
    }
  ],
  "edges": [
    { "id": "e0", "source": "Event_BeginPlay", "sourcePin": "then", "target": "PrintString", "targetPin": "execute", "category": "exec" }
  ]
}
\`\`\`

### Example 2: Branching (health check with true/false paths)

User: "When the game starts, check if health is above 50, print 'Health OK' if true, destroy the actor if false"

\`\`\`json
{
  "metadata": { "title": "EventGraph", "assetPath": "/Game/BP_Generated" },
  "nodes": [
    {
      "id": "Event_BeginPlay", "type": "event", "nodeClass": "K2Node_Event",
      "nodeGuid": "B000B000C000D000E000F00011112222", "position": { "x": 0, "y": 0 },
      "title": "Event BeginPlay",
      "properties": { "EventReference": "(MemberParent=\\"/Script/Engine.Actor\\",MemberName=\\"ReceiveBeginPlay\\")", "bOverrideFunction": "True" },
      "pins": [{ "id": "bp-then", "name": "then", "direction": "output", "category": "exec" }]
    },
    {
      "id": "GetHealth", "type": "variable_get", "nodeClass": "K2Node_VariableGet",
      "nodeGuid": "B100B100C100D100E100F10011112222", "position": { "x": 40, "y": 180 },
      "title": "Health",
      "properties": { "VariableReference": "(MemberName=\\"Health\\",bSelfContext=True)" },
      "pins": [{ "id": "gh-out", "name": "Health", "direction": "output", "category": "real", "subType": "double" }]
    },
    {
      "id": "GreaterThan", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "B200B200C200D200E200F20011112222", "position": { "x": 300, "y": 140 },
      "title": "> (Greater Than)",
      "properties": { "FunctionReference": "(MemberParent=\\"/Script/Engine.KismetMathLibrary\\",MemberName=\\"Greater_FloatFloat\\")" },
      "pins": [
        { "id": "gt-a", "name": "A", "direction": "input", "category": "real", "subType": "double" },
        { "id": "gt-b", "name": "B", "direction": "input", "category": "real", "subType": "double", "defaultValue": "50.0" },
        { "id": "gt-out", "name": "ReturnValue", "direction": "output", "category": "bool" }
      ]
    },
    {
      "id": "Branch", "type": "flow_control", "nodeClass": "K2Node_IfThenElse",
      "nodeGuid": "B300B300C300D300E300F30011112222", "position": { "x": 320, "y": 0 },
      "title": "Branch", "properties": {},
      "pins": [
        { "id": "br-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "br-cond", "name": "Condition", "direction": "input", "category": "bool" },
        { "id": "br-true", "name": "then", "direction": "output", "category": "exec" },
        { "id": "br-false", "name": "else", "direction": "output", "category": "exec" }
      ]
    },
    {
      "id": "PrintString", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "B400B400C400D400E400F40011112222", "position": { "x": 660, "y": -30 },
      "title": "Print String",
      "properties": { "FunctionReference": "(MemberParent=\\"/Script/Engine.KismetSystemLibrary\\",MemberName=\\"PrintString\\")" },
      "pins": [
        { "id": "ps-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "ps-then", "name": "then", "direction": "output", "category": "exec" },
        { "id": "ps-str", "name": "In String", "direction": "input", "category": "string", "defaultValue": "Health OK" }
      ]
    },
    {
      "id": "DestroyActor", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "B500B500C500D500E500F50011112222", "position": { "x": 660, "y": 160 },
      "title": "Destroy Actor",
      "properties": { "FunctionReference": "(MemberParent=\\"/Script/Engine.Actor\\",MemberName=\\"K2_DestroyActor\\")" },
      "pins": [
        { "id": "da-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "da-then", "name": "then", "direction": "output", "category": "exec" },
        { "id": "da-target", "name": "Target", "direction": "input", "category": "object", "defaultValue": "self" }
      ]
    }
  ],
  "edges": [
    { "id": "e0", "source": "Event_BeginPlay", "sourcePin": "then", "target": "Branch", "targetPin": "execute", "category": "exec" },
    { "id": "e1", "source": "GetHealth", "sourcePin": "Health", "target": "GreaterThan", "targetPin": "A", "category": "real" },
    { "id": "e2", "source": "GreaterThan", "sourcePin": "ReturnValue", "target": "Branch", "targetPin": "Condition", "category": "bool" },
    { "id": "e3", "source": "Branch", "sourcePin": "then", "target": "PrintString", "targetPin": "execute", "category": "exec" },
    { "id": "e4", "source": "Branch", "sourcePin": "else", "target": "DestroyActor", "targetPin": "execute", "category": "exec" }
  ]
}
\`\`\`

### Example 3: Loop pattern (EventTick → ForEachLoop → SetVisibility)

User: "Every tick, loop through an array of meshes and set them all visible"

\`\`\`json
{
  "metadata": { "title": "EventGraph", "assetPath": "/Game/BP_Generated" },
  "nodes": [
    {
      "id": "Event_Tick", "type": "event", "nodeClass": "K2Node_Event",
      "nodeGuid": "C000C000C000D000E000F00011112222", "position": { "x": 0, "y": 0 },
      "title": "Event Tick",
      "properties": { "EventReference": "(MemberParent=\\"/Script/Engine.Actor\\",MemberName=\\"ReceiveTick\\")", "bOverrideFunction": "True" },
      "pins": [
        { "id": "et-then", "name": "then", "direction": "output", "category": "exec" },
        { "id": "et-dt", "name": "Delta Seconds", "direction": "output", "category": "real", "subType": "float" }
      ]
    },
    {
      "id": "GetMeshes", "type": "variable_get", "nodeClass": "K2Node_VariableGet",
      "nodeGuid": "C100C100C100D100E100F10011112222", "position": { "x": 40, "y": 160 },
      "title": "Meshes",
      "properties": { "VariableReference": "(MemberName=\\"Meshes\\",bSelfContext=True)" },
      "pins": [{ "id": "gm-out", "name": "Meshes", "direction": "output", "category": "object" }]
    },
    {
      "id": "ForEachLoop", "type": "flow_control", "nodeClass": "K2Node_ForEachLoop",
      "nodeGuid": "C200C200C200D200E200F20011112222", "position": { "x": 280, "y": 0 },
      "title": "For Each Loop", "properties": {},
      "pins": [
        { "id": "fe-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "fe-array", "name": "Array", "direction": "input", "category": "object" },
        { "id": "fe-body", "name": "Loop Body", "direction": "output", "category": "exec" },
        { "id": "fe-elem", "name": "Array Element", "direction": "output", "category": "object" },
        { "id": "fe-idx", "name": "Array Index", "direction": "output", "category": "int" },
        { "id": "fe-done", "name": "Completed", "direction": "output", "category": "exec" }
      ]
    },
    {
      "id": "SetVisibility", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "C300C300C300D300E300F30011112222", "position": { "x": 600, "y": 0 },
      "title": "Set Visibility",
      "properties": { "FunctionReference": "(MemberParent=\\"/Script/Engine.SceneComponent\\",MemberName=\\"SetVisibility\\")" },
      "pins": [
        { "id": "sv-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "sv-then", "name": "then", "direction": "output", "category": "exec" },
        { "id": "sv-target", "name": "Target", "direction": "input", "category": "object" },
        { "id": "sv-vis", "name": "bNewVisibility", "direction": "input", "category": "bool", "defaultValue": "true" }
      ]
    }
  ],
  "edges": [
    { "id": "e0", "source": "Event_Tick", "sourcePin": "then", "target": "ForEachLoop", "targetPin": "execute", "category": "exec" },
    { "id": "e1", "source": "GetMeshes", "sourcePin": "Meshes", "target": "ForEachLoop", "targetPin": "Array", "category": "object" },
    { "id": "e2", "source": "ForEachLoop", "sourcePin": "Loop Body", "target": "SetVisibility", "targetPin": "execute", "category": "exec" },
    { "id": "e3", "source": "ForEachLoop", "sourcePin": "Array Element", "target": "SetVisibility", "targetPin": "Target", "category": "object" }
  ]
}
\`\`\`

<rules>
1. Output ONLY a \`\`\`json\`\`\` code block with valid UEGraphJSON
2. Every node MUST have at least one pin
3. Every exec-flow (impure) node must have exec input and output pins
4. Use descriptive node IDs and titles
5. Generate unique 32-char hex nodeGuid strings for each node (0-9, A-F only)
6. Connect nodes with proper edges matching pin names and categories
7. ALWAYS include required properties (EventReference, FunctionReference, VariableReference) — nodes without these will appear as "None" when pasted into UE
8. Variable getter titles should be the variable name (e.g. "Health"), not "Get Health"
9. Variable setter titles should be "Set VariableName" (e.g. "Set Health")
10. Pure functions (math, comparisons) must NOT have exec pins
</rules>

<constraints>
- Do not use pin categories outside the valid set listed above
- Do not invent nodeClass names — use only the common values listed
- Do not omit properties for Event, CallFunction, or Variable nodes
- Do not create edges that reference non-existent pins or nodes
- Do not use non-hex characters in nodeGuid (no lowercase, no special chars)
</constraints>`;

/** Generate a proper 32-char uppercase hex GUID for UE nodes. */
function generateNodeGuid(): string {
  const hex = '0123456789ABCDEF';
  let guid = '';
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)];
  return guid;
}

/** Fill missing optional UEPin fields with defaults. */
export function normalizeGeneratedPin(pin: Partial<UEPin>): UEPin {
  return {
    id: pin.id ?? '',
    name: pin.name ?? '',
    friendlyName: pin.friendlyName ?? pin.name ?? '',
    direction: pin.direction ?? 'input',
    category: (VALID_PIN_CATEGORIES.has(pin.category as PinCategory) ? pin.category : 'wildcard') as PinCategory,
    subCategory: pin.subCategory ?? (pin as Record<string, unknown>).subType as string ?? '',
    subCategoryObject: pin.subCategoryObject ?? '',
    containerType: pin.containerType ?? '',
    defaultValue: pin.defaultValue ?? '',
    isReference: pin.isReference ?? false,
    isConst: pin.isConst ?? false,
    isWeak: pin.isWeak ?? false,
    hidden: pin.hidden ?? false,
    advancedView: pin.advancedView ?? false,
  };
}

export interface GenerationResult {
  graph: UEGraphJSON;
  droppedEdges: number;
  corrections: string[];
}

/** Extract and parse a UEGraphJSON from an AI response containing a ```json block. */
export function parseGeneratedGraph(aiResponse: string): GenerationResult | null {
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

  // Validate metadata
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  if (!metadata || typeof metadata.title !== 'string') return null;

  // Validate nodes
  const nodes = obj.nodes as unknown[];
  if (!Array.isArray(nodes) || nodes.length === 0) return null;

  const validatedNodes: UENode[] = [];
  for (const raw of nodes) {
    const n = raw as Record<string, unknown>;
    if (!n.id || !n.title || !Array.isArray(n.pins) || n.pins.length === 0) return null;

    const nodeType = VALID_NODE_TYPES.has(n.type as string) ? n.type as string : 'call_function';
    const pos = n.position as { x?: number; y?: number } | undefined;

    const nodeClass = String(n.nodeClass ?? 'K2Node_CallFunction');
    const title = String(n.title);
    const rawProps = (n.properties as Record<string, unknown>) ?? {};
    // Synthesize missing UE properties using DB-backed synthesis (2,700+ functions)
    const properties = synthesizeNodePropertiesWithDB(nodeClass, title, rawProps);

    validatedNodes.push({
      id: String(n.id),
      type: nodeType,
      nodeClass,
      nodeGuid: String(n.nodeGuid ?? generateNodeGuid()),
      position: { x: Number(pos?.x ?? 0), y: Number(pos?.y ?? 0) },
      title,
      properties,
      pins: (n.pins as Partial<UEPin>[]).map(normalizeGeneratedPin),
    });
  }

  // Deduplicate nodeGuids — ensure all are 32-char uppercase hex
  const usedGuids = new Set<string>();
  for (const node of validatedNodes) {
    const isValidGuid = /^[0-9A-F]{32}$/.test(node.nodeGuid);
    while (!isValidGuid || usedGuids.has(node.nodeGuid) || node.nodeGuid.length !== 32) {
      node.nodeGuid = generateNodeGuid();
      break; // re-check in next iteration
    }
    // Final dedup loop
    while (usedGuids.has(node.nodeGuid)) {
      node.nodeGuid = generateNodeGuid();
    }
    usedGuids.add(node.nodeGuid);
  }

  // Build pin index for edge cross-validation
  const pinIndex = new Set<string>();
  for (const node of validatedNodes) {
    for (const pin of node.pins) {
      pinIndex.add(`${node.id}:${pin.name}`);
    }
  }

  // Validate edges
  const edges = obj.edges as unknown[];
  if (!Array.isArray(edges)) return null;

  const validatedEdges: UEEdge[] = [];
  let droppedEdges = 0;
  for (const raw of edges) {
    const e = raw as Record<string, unknown>;
    if (!e.id || !e.source || !e.sourcePin || !e.target || !e.targetPin) continue;

    // Cross-validate: source/target pins must exist on their nodes
    if (!pinIndex.has(`${e.source}:${e.sourcePin}`) || !pinIndex.has(`${e.target}:${e.targetPin}`)) {
      console.warn(`[ue-flow] Dropping edge ${e.id}: pin not found on node`);
      droppedEdges++;
      continue;
    }

    validatedEdges.push({
      id: String(e.id),
      source: String(e.source),
      sourcePin: String(e.sourcePin),
      target: String(e.target),
      targetPin: String(e.targetPin),
      category: (VALID_PIN_CATEGORIES.has(e.category as PinCategory) ? e.category : 'wildcard') as PinCategory,
    });
  }

  const rawGraph: UEGraphJSON = {
    metadata: {
      title: String(metadata.title),
      assetPath: String(metadata.assetPath ?? '/Game/BP_Generated'),
    },
    nodes: validatedNodes,
    edges: validatedEdges,
  };

  // Apply signature DB validation (corrects pins, fills defaults, fixes parents)
  const { graph: corrected, corrections, warnings } = validateGeneratedGraph(rawGraph);
  if (corrections.length > 0) {
    console.log('[ue-flow] Signature DB corrections:', corrections);
  }
  if (warnings.length > 0) {
    console.warn('[ue-flow] Signature DB warnings:', warnings);
  }

  return { graph: corrected, droppedEdges, corrections };
}

/** Shift all node positions by an offset. */
export function offsetGraphPositions(
  graph: UEGraphJSON,
  offsetX: number,
  offsetY: number,
): UEGraphJSON {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
    })),
  };
}
