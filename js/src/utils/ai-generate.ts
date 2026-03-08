import type { UEGraphJSON, UEPin, UENode, UEEdge } from '../types/ue-graph';
import type { PinCategory } from '../types/pin-types';

const VALID_NODE_TYPES = new Set([
  'event', 'call_function', 'variable_get', 'variable_set',
  'flow_control', 'cast', 'comment', 'reroute',
]);

const VALID_PIN_CATEGORIES = new Set<PinCategory>([
  'exec', 'bool', 'real', 'int', 'byte', 'string', 'name', 'text',
  'object', 'struct', 'enum', 'wildcard', 'float', 'class', 'interface',
  'delegate', 'softclass', 'softobject',
]);

export const GENERATE_SYSTEM_PROMPT = `You are a UE Blueprint generator. Given a natural language description, output a valid UEGraphJSON object as a JSON code block.

## UEGraphJSON Schema

\`\`\`
{
  "metadata": { "title": "string", "assetPath": "string" },
  "nodes": [UENode],
  "edges": [UEEdge]
}
\`\`\`

**UENode**: \`{ id, type, nodeClass, nodeGuid, position: {x, y}, title, properties: {}, pins: [UEPin] }\`
- Valid \`type\` values: \`event\`, \`call_function\`, \`variable_get\`, \`variable_set\`, \`flow_control\`, \`cast\`, \`comment\`
- Common nodeClass values: \`K2Node_Event\`, \`K2Node_CallFunction\`, \`K2Node_IfThenElse\`, \`K2Node_VariableGet\`, \`K2Node_VariableSet\`, \`K2Node_DynamicCast\`, \`K2Node_ForEachLoop\`, \`K2Node_Delay\`, \`K2Node_Timeline\`, \`EdGraphNode_Comment\`
- nodeGuid: unique hex string per node (e.g. "A000B000C000D000")

**UEPin**: \`{ id, name, direction: "input"|"output", category }\`
- Optional: \`defaultValue\`, \`subType\`
- Valid \`category\` values: \`exec\`, \`bool\`, \`real\`, \`int\`, \`byte\`, \`string\`, \`name\`, \`text\`, \`object\`, \`struct\`, \`enum\`, \`wildcard\`

**UEEdge**: \`{ id, source, sourcePin, target, targetPin, category }\`
- \`source\`/\`target\` are node IDs; \`sourcePin\`/\`targetPin\` are pin names
- \`category\` matches the pin type being connected

## Layout Guidelines
- ~280px horizontal spacing between sequential nodes
- ~160px vertical offset for branches
- Events start at x:0, y:0

## Few-Shot Example

User: "When the game starts, check if health is above 50, print 'Health OK' if true, destroy the actor if false"

\`\`\`json
{
  "metadata": { "title": "EventGraph", "assetPath": "/Game/BP_Generated" },
  "nodes": [
    {
      "id": "Event_BeginPlay", "type": "event", "nodeClass": "K2Node_Event",
      "nodeGuid": "A000B000C000D000", "position": { "x": 0, "y": 0 },
      "title": "Event BeginPlay", "properties": {},
      "pins": [{ "id": "bp-then", "name": "then", "direction": "output", "category": "exec" }]
    },
    {
      "id": "GetHealth", "type": "variable_get", "nodeClass": "K2Node_VariableGet",
      "nodeGuid": "A100B100C100D100", "position": { "x": 40, "y": 180 },
      "title": "Get Health", "properties": {},
      "pins": [{ "id": "gh-out", "name": "Health", "direction": "output", "category": "real", "subType": "double" }]
    },
    {
      "id": "GreaterThan", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "A200B200C200D200", "position": { "x": 300, "y": 140 },
      "title": "> (Greater Than)", "properties": {},
      "pins": [
        { "id": "gt-a", "name": "A", "direction": "input", "category": "real", "subType": "double" },
        { "id": "gt-b", "name": "B", "direction": "input", "category": "real", "subType": "double", "defaultValue": "50.0" },
        { "id": "gt-out", "name": "ReturnValue", "direction": "output", "category": "bool" }
      ]
    },
    {
      "id": "Branch", "type": "flow_control", "nodeClass": "K2Node_IfThenElse",
      "nodeGuid": "A300B300C300D300", "position": { "x": 320, "y": 0 },
      "title": "Branch", "properties": {},
      "pins": [
        { "id": "br-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "br-cond", "name": "Condition", "direction": "input", "category": "bool" },
        { "id": "br-true", "name": "True", "direction": "output", "category": "exec" },
        { "id": "br-false", "name": "False", "direction": "output", "category": "exec" }
      ]
    },
    {
      "id": "PrintString", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "A400B400C400D400", "position": { "x": 660, "y": -30 },
      "title": "Print String", "properties": {},
      "pins": [
        { "id": "ps-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "ps-then", "name": "then", "direction": "output", "category": "exec" },
        { "id": "ps-str", "name": "In String", "direction": "input", "category": "string", "defaultValue": "Health OK" }
      ]
    },
    {
      "id": "DestroyActor", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "A500B500C500D500", "position": { "x": 660, "y": 160 },
      "title": "Destroy Actor", "properties": {},
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
    { "id": "e3", "source": "Branch", "sourcePin": "True", "target": "PrintString", "targetPin": "execute", "category": "exec" },
    { "id": "e4", "source": "Branch", "sourcePin": "False", "target": "DestroyActor", "targetPin": "execute", "category": "exec" }
  ]
}
\`\`\`

## Rules
- Output ONLY a \`\`\`json\`\`\` code block with valid UEGraphJSON
- Every node MUST have at least one pin
- Every exec-flow node should have exec input and output pins
- Use descriptive node IDs and titles
- Generate unique nodeGuid hex strings for each node
- Connect nodes with proper edges matching pin names and categories`;

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

/** Extract and parse a UEGraphJSON from an AI response containing a ```json block. */
export function parseGeneratedGraph(aiResponse: string): UEGraphJSON | null {
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
    if (!n.id || !n.title || !Array.isArray(n.pins)) return null;

    const nodeType = VALID_NODE_TYPES.has(n.type as string) ? n.type as string : 'call_function';
    const pos = n.position as { x?: number; y?: number } | undefined;

    validatedNodes.push({
      id: String(n.id),
      type: nodeType,
      nodeClass: String(n.nodeClass ?? 'K2Node_CallFunction'),
      nodeGuid: String(n.nodeGuid ?? Math.random().toString(16).slice(2, 18).toUpperCase()),
      position: { x: Number(pos?.x ?? 0), y: Number(pos?.y ?? 0) },
      title: String(n.title),
      properties: (n.properties as Record<string, unknown>) ?? {},
      pins: (n.pins as Partial<UEPin>[]).map(normalizeGeneratedPin),
    });
  }

  // Validate edges
  const edges = obj.edges as unknown[];
  if (!Array.isArray(edges)) return null;

  const validatedEdges: UEEdge[] = [];
  for (const raw of edges) {
    const e = raw as Record<string, unknown>;
    if (!e.id || !e.source || !e.sourcePin || !e.target || !e.targetPin) continue;

    validatedEdges.push({
      id: String(e.id),
      source: String(e.source),
      sourcePin: String(e.sourcePin),
      target: String(e.target),
      targetPin: String(e.targetPin),
      category: (VALID_PIN_CATEGORIES.has(e.category as PinCategory) ? e.category : 'wildcard') as PinCategory,
    });
  }

  return {
    metadata: {
      title: String(metadata.title),
      assetPath: String(metadata.assetPath ?? '/Game/BP_Generated'),
    },
    nodes: validatedNodes,
    edges: validatedEdges,
  };
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
