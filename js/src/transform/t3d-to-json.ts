/**
 * Parse UE T3D paste text and serialize directly to UEGraphJSON.
 *
 * This is the client-side port of Python t3d_parser.py + t3d_json.py,
 * enabling paste-to-render without any server or CLI dependency.
 */
import type { UEGraphJSON, UENode, UEPin, UEEdge } from '../types/ue-graph';
import type { PinCategory } from '../types/pin-types';

// ---------------------------------------------------------------------------
// Regex patterns (ported from t3d_parser.py)
// ---------------------------------------------------------------------------

const OBJECT_BLOCK_RE = /Begin Object\s+(.*?)\n(.*?)End Object/gs;

const HEADER_KV_RE = /(\w+)="((?:[^"\\]|\\.)*)"|(\w+)=(\S+)/g;

const PIN_LINE_RE = /CustomProperties\s+Pin\s+\((.+)\)\s*$/;

const PROPERTY_LINE_RE = /^\s+(\w+)=(.*)/;

// ---------------------------------------------------------------------------
// Category lookup — maps lowercase T3D strings to PinCategory
// ---------------------------------------------------------------------------

const CATEGORY_SET = new Set<string>([
  'exec', 'object', 'bool', 'real', 'struct', 'delegate', 'int',
  'string', 'name', 'byte', 'class', 'enum', 'interface',
  'softclass', 'softobject', 'text', 'wildcard', 'float',
]);

function toCategory(raw: string): PinCategory {
  const lower = raw.toLowerCase();
  if (CATEGORY_SET.has(lower)) return lower as PinCategory;
  return 'exec'; // fallback matches Python
}

// ---------------------------------------------------------------------------
// Pin parsing helpers
// ---------------------------------------------------------------------------

function parseBool(value: string): boolean {
  return value.trim().toLowerCase() === 'true';
}

/**
 * Extract display text from NSLOCTEXT("Namespace", "Key", "DisplayText").
 * Returns the display text (3rd argument), or the raw string if not NSLOCTEXT format.
 */
function parseNSLOCTEXT(value: string): string {
  const m = value.match(/^NSLOCTEXT\s*\(\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*"([^"]*)"\s*\)/);
  return m ? m[1] : value;
}

interface LinkedToEntry {
  nodeName: string;
  pinId: string;
}

function parseLinkedTo(raw: string): LinkedToEntry[] {
  const result: LinkedToEntry[] = [];
  const entries = raw.split(',').map(e => e.trim()).filter(Boolean);
  for (const entry of entries) {
    const parts = entry.split(/\s+/);
    if (parts.length === 2) {
      result.push({ nodeName: parts[0], pinId: parts[1] });
    }
  }
  return result;
}

/**
 * Tokenize the comma-separated Key=Value pairs inside a Pin(...) line.
 *
 * Handles quoted strings with commas, nested parentheses with commas,
 * and unquoted bare values.
 */
export function tokenizePinContent(content: string): Array<[string, string]> {
  const tokens: Array<[string, string]> = [];
  let i = 0;
  const len = content.length;

  while (i < len) {
    // Skip whitespace and commas
    while (i < len && (content[i] === ' ' || content[i] === ',' || content[i] === '\t')) {
      i++;
    }
    if (i >= len) break;

    // Read key (up to '=')
    const keyStart = i;
    while (i < len && content[i] !== '=') i++;
    if (i >= len) break;
    const key = content.slice(keyStart, i);
    i++; // skip '='

    if (i >= len) {
      tokens.push([key, '']);
      break;
    }

    // Read value — depends on first character
    if (content[i] === '"') {
      // Quoted string — read until closing quote (handle escaped quotes)
      i++; // skip opening quote
      const valStart = i;
      while (i < len) {
        if (content[i] === '\\' && i + 1 < len) {
          i += 2; // skip escape sequence
        } else if (content[i] === '"') {
          break;
        } else {
          i++;
        }
      }
      const value = content.slice(valStart, i);
      if (i < len) i++; // skip closing quote
      tokens.push([key, value]);
    } else if (content[i] === '(') {
      // Parenthesized value — match balanced parens
      let depth = 1;
      i++; // skip opening paren
      const valStart = i;
      while (i < len && depth > 0) {
        if (content[i] === '(') {
          depth++;
        } else if (content[i] === ')') {
          depth--;
        } else if (content[i] === '"') {
          // Skip quoted strings inside parens
          i++;
          while (i < len && content[i] !== '"') {
            if (content[i] === '\\' && i + 1 < len) i++;
            i++;
          }
        }
        i++;
      }
      const value = depth === 0
        ? content.slice(valStart, i - 1)
        : content.slice(valStart, i);
      tokens.push([key, '(' + value + ')']);
    } else {
      // Unquoted value — read until comma or end, but track balanced parens
      // so function-call-like values (e.g., NSLOCTEXT("K2Node","true","true"))
      // are captured in full.
      const valStart = i;
      let parenDepth = 0;
      while (i < len) {
        if (content[i] === '(') {
          parenDepth++;
        } else if (content[i] === ')') {
          if (parenDepth > 0) {
            parenDepth--;
            if (parenDepth === 0) {
              i++; // include closing paren
              break;
            }
          } else {
            break;
          }
        } else if (content[i] === '"' && parenDepth > 0) {
          // Skip quoted strings inside parens
          i++;
          while (i < len && content[i] !== '"') {
            if (content[i] === '\\' && i + 1 < len) i++;
            i++;
          }
        } else if (content[i] === ',' && parenDepth === 0) {
          break;
        }
        i++;
      }
      const value = content.slice(valStart, i).trimEnd();
      tokens.push([key, value]);
    }
  }

  return tokens;
}

interface ParsedPin {
  pin: UEPin;
  linkedTo: LinkedToEntry[];
}

function parsePin(content: string): ParsedPin {
  const tokens = tokenizePinContent(content);

  // Defaults
  let pinId = '';
  let pinName = '';
  let friendlyName = '';
  let direction: 'input' | 'output' = 'input';
  let category: PinCategory = 'exec';
  let subCategory = '';
  let subCategoryObject = '';
  let defaultValue = '';
  let containerType: '' | 'Array' | 'Set' | 'Map' = '';
  let isReference = false;
  let isConst = false;
  let isWeak = false;
  let autogenDefault = '';
  let linkedTo: LinkedToEntry[] = [];
  let hidden = false;
  let advancedView = false;
  let pinSubCategoryMemberRef = '';
  let description: string | undefined;

  for (const [key, value] of tokens) {
    switch (key) {
      case 'PinId':
        pinId = value;
        break;
      case 'PinName':
        pinName = value;
        break;
      case 'PinFriendlyName':
        friendlyName = parseNSLOCTEXT(value);
        break;
      case 'Direction': {
        const dirStr = value.replace(/"/g, '');
        direction = dirStr === 'EGPD_Output' ? 'output' : 'input';
        break;
      }
      case 'PinType.PinCategory': {
        const catStr = value.replace(/"/g, '').toLowerCase();
        category = toCategory(catStr);
        break;
      }
      case 'PinType.PinSubCategory':
        subCategory = value.replace(/"/g, '');
        break;
      case 'PinType.PinSubCategoryObject':
        subCategoryObject = (value === 'None' || value === '') ? '' : value;
        break;
      case 'PinType.PinSubCategoryMemberReference': {
        let inner = value;
        if (inner.startsWith('(') && inner.endsWith(')')) {
          inner = inner.slice(1, -1);
        }
        if (inner) {
          pinSubCategoryMemberRef = `(${inner})`;
        }
        break;
      }
      case 'PinType.ContainerType':
        if (value === 'None' || value === '') {
          containerType = '';
        } else {
          containerType = value as '' | 'Array' | 'Set' | 'Map';
        }
        break;
      case 'PinType.bIsReference':
        isReference = parseBool(value);
        break;
      case 'PinType.bIsConst':
        isConst = parseBool(value);
        break;
      case 'PinType.bIsWeakPointer':
        isWeak = parseBool(value);
        break;
      case 'DefaultValue':
        defaultValue = value;
        break;
      case 'AutogeneratedDefaultValue':
        autogenDefault = value;
        break;
      case 'LinkedTo': {
        let inner = value;
        if (inner.startsWith('(') && inner.endsWith(')')) {
          inner = inner.slice(1, -1);
        }
        linkedTo = parseLinkedTo(inner);
        break;
      }
      case 'bHidden':
        hidden = parseBool(value);
        break;
      case 'bAdvancedView':
        advancedView = parseBool(value);
        break;
      case 'PinToolTip':
        try {
          description = decodeURIComponent(value.replace(/\+/g, ' '));
        } catch {
          description = value;
        }
        break;
      // Ignored keys: PersistentGuid, bDefaultValueIsReadOnly, bOrphanedPin, etc.
    }
  }

  const pin: UEPin = {
    id: pinId,
    name: pinName,
    friendlyName,
    direction,
    category,
    subCategory,
    subCategoryObject,
    containerType,
    defaultValue,
    isReference,
    isConst,
    isWeak,
    hidden,
    advancedView,
  };
  if (autogenDefault) pin.autogeneratedDefaultValue = autogenDefault;
  if (description) pin.description = description;
  if (pinSubCategoryMemberRef) pin.pinSubCategoryMemberReference = pinSubCategoryMemberRef;

  return { pin, linkedTo };
}

// ---------------------------------------------------------------------------
// Node parsing
// ---------------------------------------------------------------------------

function parseHeader(headerLine: string): Record<string, string> {
  const result: Record<string, string> = {};
  let match;
  const re = new RegExp(HEADER_KV_RE.source, 'g');
  while ((match = re.exec(headerLine)) !== null) {
    if (match[1] !== undefined) {
      // Quoted value: group(1)=key, group(2)=value
      result[match[1]] = match[2];
    } else {
      // Unquoted value: group(3)=key, group(4)=value
      result[match[3]] = match[4];
    }
  }
  return result;
}

interface ParsedNode {
  nodeClass: string;
  nodeName: string;
  posX: number;
  posY: number;
  nodeGuid: string;
  properties: Record<string, string>;
  pins: ParsedPin[];
}

function parseNodeBody(headerAttrs: Record<string, string>, body: string): ParsedNode {
  const nodeClass = headerAttrs['Class'] ?? '';
  const nodeName = headerAttrs['Name'] ?? '';

  let posX = 0;
  let posY = 0;
  let nodeGuid = '';
  const properties: Record<string, string> = {};
  const pins: ParsedPin[] = [];

  for (const line of body.split('\n')) {
    const stripped = line.trim();
    if (!stripped) continue;

    // Check for CustomProperties Pin line
    const pinMatch = PIN_LINE_RE.exec(stripped);
    if (pinMatch) {
      pins.push(parsePin(pinMatch[1]));
      continue;
    }

    // Check for property line
    const propMatch = PROPERTY_LINE_RE.exec(line);
    if (propMatch) {
      const key = propMatch[1];
      const value = propMatch[2];

      if (key === 'NodePosX') {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) posX = parsed;
      } else if (key === 'NodePosY') {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) posY = parsed;
      } else if (key === 'NodeGuid') {
        nodeGuid = value.trim();
      } else {
        properties[key] = value;
      }
    }
  }

  if (!nodeGuid) {
    // Generate a 32-char uppercase hex GUID
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    nodeGuid = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  return { nodeClass, nodeName, posX, posY, nodeGuid, properties, pins };
}

// ---------------------------------------------------------------------------
// Type inference (ported from t3d_json.py)
// ---------------------------------------------------------------------------

const CLASS_TO_TYPE: Record<string, string> = {
  K2Node_Event: 'event',
  K2Node_CustomEvent: 'event',
  K2Node_CallFunction: 'call_function',
  K2Node_IfThenElse: 'branch',
  K2Node_VariableGet: 'variable_get',
  K2Node_VariableSet: 'variable_set',
  K2Node_MacroInstance: 'macro',
  K2Node_Tunnel: 'tunnel',
  K2Node_Knot: 'reroute',
  EdGraphNode_Comment: 'comment',
  K2Node_FunctionEntry: 'function_entry',
  K2Node_FunctionResult: 'function_result',
  K2Node_DynamicCast: 'cast',
  K2Node_ClassDynamicCast: 'cast',
  K2Node_Select: 'select',
  K2Node_MakeArray: 'make_array',
  K2Node_SwitchEnum: 'switch',
  K2Node_SwitchInteger: 'switch',
  K2Node_SwitchString: 'switch',
  K2Node_SwitchName: 'switch',
  K2Node_ExecutionSequence: 'sequence',
  K2Node_ForEachElementInEnum: 'foreach',
  K2Node_ForEachLoop: 'foreach',
  K2Node_ForEachLoopWithBreak: 'foreach',
  K2Node_MakeStruct: 'struct_op',
  K2Node_BreakStruct: 'struct_op',
  K2Node_SetFieldsInStruct: 'struct_op',
  K2Node_Timeline: 'timeline',
  K2Node_SpawnActorFromClass: 'call_function',
  K2Node_GetArrayItem: 'function',
  K2Node_CommutativeAssociativeBinaryOperator: 'call_function',
  K2Node_PromotableOperator: 'call_function',
  K2Node_DoOnce: 'branch',
  K2Node_Gate: 'branch',
  K2Node_FlipFlop: 'branch',
  K2Node_MultiGate: 'sequence',
  K2Node_CallDelegate: 'delegate_call',
  K2Node_AddDelegate: 'delegate_add',
  K2Node_RemoveDelegate: 'delegate_remove',
  K2Node_ClearDelegate: 'delegate_clear',
  K2Node_AsyncAction: 'async_action',
  K2Node_LatentGameplayTaskCall: 'latent_task',
  K2Node_ConstructObjectFromClass: 'construct',
  K2Node_CreateWidget: 'construct',
  K2Node_GenericCreateObject: 'construct',
  K2Node_GetSubsystem: 'subsystem_get',
  K2Node_InputKey: 'input',
  K2Node_InputTouch: 'input',
  K2Node_InputAction: 'input',
  K2Node_InputAxisEvent: 'event',
  K2Node_InputAxisKeyEvent: 'event',
  K2Node_EnhancedInputAction: 'event',
  K2Node_ComponentBoundEvent: 'component_event',
  K2Node_ActorBoundEvent: 'event',
};

function inferType(nodeClass: string): string {
  const shortName = nodeClass.includes('.') ? nodeClass.split('.').pop()! : nodeClass;
  return CLASS_TO_TYPE[shortName] ?? 'function';
}

// ---------------------------------------------------------------------------
// Title inference (ported from t3d_json.py)
// ---------------------------------------------------------------------------

const FRIENDLY_TITLES: Record<string, string> = {
  K2Node_IfThenElse: 'Branch',
  K2Node_Knot: 'Reroute',
  K2Node_MakeArray: 'Make Array',
  K2Node_FunctionResult: 'Return Node',
  K2Node_SwitchEnum: 'Switch on Enum',
  K2Node_SwitchInteger: 'Switch on Int',
  K2Node_SwitchString: 'Switch on String',
  K2Node_SwitchName: 'Switch on Name',
  K2Node_ExecutionSequence: 'Sequence',
  K2Node_MakeStruct: 'Make Struct',
  K2Node_BreakStruct: 'Break Struct',
  K2Node_SetFieldsInStruct: 'Set Fields in Struct',
  K2Node_Timeline: 'Timeline',
  K2Node_GetArrayItem: 'Get',
  K2Node_DoOnce: 'Do Once',
  K2Node_Gate: 'Gate',
  K2Node_FlipFlop: 'FlipFlop',
  K2Node_MultiGate: 'MultiGate',
  K2Node_ForEachLoopWithBreak: 'ForEachLoop With Break',
  K2Node_CallDelegate: 'Call Delegate',
  K2Node_AddDelegate: 'Add Delegate',
  K2Node_RemoveDelegate: 'Remove Delegate',
  K2Node_ClearDelegate: 'Clear Delegate',
  K2Node_AsyncAction: 'Async Action',
  K2Node_LatentGameplayTaskCall: 'Latent Task',
  K2Node_ConstructObjectFromClass: 'Construct Object',
  K2Node_CreateWidget: 'Create Widget',
  K2Node_GenericCreateObject: 'Create Object',
  K2Node_GetSubsystem: 'Get Subsystem',
  K2Node_ComponentBoundEvent: 'Component Event',
  K2Node_ActorBoundEvent: 'Actor Event',
};

function extractMemberName(ref: string): string | null {
  const m = ref.match(/MemberName="([^"]+)"/);
  return m ? m[1] : null;
}

function inferTitle(node: ParsedNode): string {
  const shortName = node.nodeClass.includes('.')
    ? node.nodeClass.split('.').pop()!
    : node.nodeClass;
  const props = node.properties;

  // Static friendly name lookup
  if (FRIENDLY_TITLES[shortName]) {
    return FRIENDLY_TITLES[shortName];
  }

  // Function calls -> extract function name
  if (props['FunctionReference']) {
    const name = extractMemberName(props['FunctionReference']);
    if (name) return name;
  }

  // Events -> extract event name with prefix
  if (props['EventReference']) {
    const name = extractMemberName(props['EventReference']);
    if (name) return `Event ${name}`;
  }

  // Variable get/set -> extract variable name
  if (props['VariableReference']) {
    const name = extractMemberName(props['VariableReference']);
    if (name) {
      const prefix = shortName === 'K2Node_VariableSet' ? 'Set ' : '';
      return `${prefix}${name}`;
    }
  }

  // Comments -> use NodeComment text
  if (shortName === 'EdGraphNode_Comment') {
    let comment = props['NodeComment'] ?? '';
    // Strip surrounding quotes from property value
    if (comment.startsWith('"') && comment.endsWith('"')) {
      comment = comment.slice(1, -1);
    }
    if (comment) return comment.slice(0, 80);
    return 'Comment';
  }

  // Dynamic cast -> "Cast To ClassName"
  if ((shortName === 'K2Node_DynamicCast' || shortName === 'K2Node_ClassDynamicCast') && props['TargetType']) {
    const target = props['TargetType'];
    const cls = target.includes('.') ? target.split('.').pop()! : target;
    return `Cast To ${cls}`;
  }

  // Macro -> extract macro name
  if (props['MacroGraphReference']) {
    const name = extractMemberName(props['MacroGraphReference']);
    if (name) return name;
  }

  // Function entry -> use SignatureName or "Function Entry"
  if (shortName === 'K2Node_FunctionEntry') {
    const sig = props['SignatureName'] ?? '';
    if (sig) return sig;
    return 'Function Entry';
  }

  // InputAction -> "InputAction ActionName"
  if (shortName === 'K2Node_InputAction') {
    const actionName = props['InputActionName'] ?? '';
    if (actionName) return `InputAction ${actionName}`;
    return 'InputAction';
  }

  // InputAxisEvent -> "InputAxis AxisName"
  if (shortName === 'K2Node_InputAxisEvent') {
    const axisName = props['InputAxisName'] ?? '';
    if (axisName) return `InputAxis ${axisName}`;
    return 'InputAxis';
  }

  // InputAxisKeyEvent / InputKey -> use InputAxisKey or InputKey property
  if (shortName === 'K2Node_InputAxisKeyEvent' || shortName === 'K2Node_InputKey' || shortName === 'K2Node_InputTouch') {
    let keyName = props['InputAxisKey'] ?? props['InputKey'] ?? props['InputKeyName'] ?? '';
    if (keyName) {
      if (keyName.startsWith('(')) {
        const m = keyName.match(/KeyName="?([^",)]+)"?/);
        if (m) keyName = m[1];
      }
      return keyName;
    }
    return shortName.replace('K2Node_', '');
  }

  // EnhancedInputAction -> use InputAction asset reference
  if (shortName === 'K2Node_EnhancedInputAction') {
    const action = props['InputAction'] ?? '';
    if (action) {
      const base = action.includes('.') ? action.split('.').pop()! : action.split('/').pop()!;
      return `IA ${base}`;
    }
    return 'Enhanced InputAction';
  }

  // Tunnel nodes
  if (shortName === 'K2Node_Tunnel') {
    const inputCount = node.pins.filter(p => p.pin.direction === 'input').length;
    const outputCount = node.pins.filter(p => p.pin.direction === 'output').length;
    if (outputCount > inputCount) return 'Inputs';
    if (inputCount > outputCount) return 'Outputs';
    return 'Tunnel';
  }

  // Fallback: clean up class name
  return shortName.replace('K2Node_', '').replace('EdGraphNode_', '');
}

// ---------------------------------------------------------------------------
// Edge extraction (ported from t3d_json.py)
// ---------------------------------------------------------------------------

function extractEdges(parsedNodes: ParsedNode[]): UEEdge[] {
  const seen = new Set<string>();
  const edges: UEEdge[] = [];
  let edgeId = 0;

  // Build pin lookup for resolving pin names from pin IDs
  const pinByNodeAndId = new Map<string, UEPin>();
  for (const node of parsedNodes) {
    for (const { pin } of node.pins) {
      pinByNodeAndId.set(`${node.nodeName}:${pin.id}`, pin);
    }
  }

  for (const node of parsedNodes) {
    for (const { pin, linkedTo } of node.pins) {
      if (pin.direction === 'output' && linkedTo.length > 0) {
        for (const target of linkedTo) {
          const key = `${node.nodeName}:${pin.id}:${target.nodeName}:${target.pinId}`;
          if (!seen.has(key)) {
            seen.add(key);
            // Resolve target pin name
            const targetPin = pinByNodeAndId.get(`${target.nodeName}:${target.pinId}`);
            const targetPinName = targetPin ? targetPin.name : target.pinId;
            edges.push({
              id: `edge-${edgeId}`,
              source: node.nodeName,
              sourcePin: pin.name,
              target: target.nodeName,
              targetPin: targetPinName,
              category: pin.category,
            });
            edgeId++;
          }
        }
      }
    }
  }

  return edges;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse raw T3D paste text and produce a UEGraphJSON object ready for rendering.
 *
 * @param text - Raw T3D clipboard text (one or more Begin Object blocks)
 * @param title - Optional graph title (defaults to "EventGraph")
 */
export function parseT3DToGraphJSON(text: string, title?: string): UEGraphJSON {
  const parsedNodes: ParsedNode[] = [];

  // Reset regex lastIndex (it's global)
  OBJECT_BLOCK_RE.lastIndex = 0;
  let match;
  while ((match = OBJECT_BLOCK_RE.exec(text)) !== null) {
    const headerLine = match[1];
    const body = match[2];
    const headerAttrs = parseHeader(headerLine);
    parsedNodes.push(parseNodeBody(headerAttrs, body));
  }

  const nodes: UENode[] = parsedNodes.map((pn) => ({
    id: pn.nodeName,
    type: inferType(pn.nodeClass),
    nodeClass: pn.nodeClass,
    nodeGuid: pn.nodeGuid,
    position: { x: pn.posX, y: pn.posY },
    title: inferTitle(pn),
    properties: pn.properties as Record<string, unknown>,
    pins: pn.pins.map(pp => pp.pin),
  }));

  const edges = extractEdges(parsedNodes);

  return {
    metadata: {
      title: title ?? 'EventGraph',
      assetPath: '',
    },
    nodes,
    edges,
  };
}

/**
 * Quick test whether a string looks like T3D paste text.
 */
export function isT3DText(text: string): boolean {
  if (!text || !text.trim()) return false;
  return /Begin Object\s+Class=/i.test(text);
}
