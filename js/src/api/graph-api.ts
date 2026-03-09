/**
 * Unified GraphAPI — every graph mutation flows through here.
 *
 * Used by both UI event handlers and AI commands. Provides automatic
 * undo/redo via full-state snapshots captured before each mutation.
 */
import type { AnyFlowNode, BlueprintFlowNode, BlueprintFlowEdge, FlowNodeData, CommentFlowNode, CommentNodeData } from '../types/flow-types';
import type { UEPin, UENode } from '../types/ue-graph';
import type { PinCategory } from '../types/pin-types';
import { getExtendedPinColor, isExecPin, classifyPinType } from '../types/pin-types';
import { lookupFunction } from '../utils/signature-db';
import { synthesizeNodePropertiesWithDB } from '../utils/ue-references';
import { normalizeGeneratedPin } from '../utils/ai-generate';
import { canConnect } from './connection-validator';
import { DYNAMIC_PIN_CLASSES, generateNextPin, canRemovePin } from '../utils/dynamic-pins';
import { getStructFields, getStructPath } from '../utils/struct-registry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommandResult {
  success: boolean;
  error?: string;
  createdIds?: string[];
}

export interface BatchResult {
  results: CommandResult[];
  allSucceeded: boolean;
}

export interface ConnectionInfo {
  nodeId: string;
  pinName: string;
  pinId: string;
  direction: 'input' | 'output';
}

export interface NodeSpec {
  nodeClass: string;
  title: string;
  position: { x: number; y: number };
  type?: string;
  properties?: Record<string, unknown>;
  pins?: Partial<UEPin>[];
  description?: string;
  category?: string;
  /** For comment nodes */
  width?: number;
  height?: number;
}

/** Discriminated union for batch commands. */
export type GraphCommand =
  | { type: 'deleteNodes'; payload: { nodeIds: string[] } }
  | { type: 'deleteEdges'; payload: { edgeIds: string[] } }
  | { type: 'duplicateNodes'; payload: { nodeIds: string[] } }
  | { type: 'addEdge'; payload: { source: string; sourcePin: string; target: string; targetPin: string } }
  | { type: 'addNode'; payload: NodeSpec }
  | { type: 'addNodeFromSignature'; payload: { memberName: string; position: { x: number; y: number } } }
  | { type: 'setPinValue'; payload: { nodeId: string; pinId: string; value: string } }
  | { type: 'setNodeProperty'; payload: { nodeId: string; key: string; value: unknown } }
  | { type: 'setNodeTitle'; payload: { nodeId: string; title: string } }
  | { type: 'moveNodes'; payload: { moves: Array<{ nodeId: string; position: { x: number; y: number } }> } }
  | { type: 'insertRerouteNode'; payload: { edgeId: string; position: { x: number; y: number } } };

// ─── Undo/Redo ────────────────────────────────────────────────────────────────

interface UndoEntry {
  label: string;
  nodes: AnyFlowNode[];
  edges: BlueprintFlowEdge[];
}

const MAX_UNDO = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a 32-char uppercase hex GUID. */
function generateGuid(): string {
  const hex = '0123456789ABCDEF';
  let guid = '';
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)];
  return guid;
}

/** Helper to create a standard UEPin. */
function pin(name: string, friendlyName: string, direction: 'input' | 'output', category: PinCategory, opts?: { subCategoryObject?: string; defaultValue?: string; hidden?: boolean }): UEPin {
  return {
    id: generateGuid(), name, friendlyName: friendlyName || name, direction,
    category, subCategory: '', subCategoryObject: opts?.subCategoryObject ?? '',
    containerType: '', defaultValue: opts?.defaultValue ?? '',
    isReference: false, isConst: false, isWeak: false,
    hidden: opts?.hidden ?? false, advancedView: false,
  };
}

/** Generate pins for special node classes that aren't in the signature DB. */
function generateSpecialNodePins(shortCls: string, title: string): UEPin[] | null {
  switch (shortCls) {
    case 'K2Node_Event':
      return [
        pin('then', '', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_CustomEvent':
      return [
        pin('then', '', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_IfThenElse':
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
        pin('Condition', 'Condition', 'input', 'bool' as PinCategory),
        pin('then', 'True', 'output', 'exec' as PinCategory),
        pin('else', 'False', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_ExecutionSequence':
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
        pin('then_0', 'Then 0', 'output', 'exec' as PinCategory),
        pin('then_1', 'Then 1', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_ForEachLoop':
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
        pin('Array', 'Array', 'input', 'wildcard' as PinCategory),
        pin('LoopBody', 'Loop Body', 'output', 'exec' as PinCategory),
        pin('ArrayElement', 'Array Element', 'output', 'wildcard' as PinCategory),
        pin('ArrayIndex', 'Array Index', 'output', 'int' as PinCategory),
        pin('Completed', 'Completed', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_DoOnce':
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
        pin('Reset', 'Reset', 'input', 'exec' as PinCategory),
        pin('StartClosed', 'Start Closed', 'input', 'bool' as PinCategory, { defaultValue: 'false' }),
        pin('Completed', 'Completed', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_Gate':
      return [
        pin('Enter', 'Enter', 'input', 'exec' as PinCategory),
        pin('Open', 'Open', 'input', 'exec' as PinCategory),
        pin('Close', 'Close', 'input', 'exec' as PinCategory),
        pin('Toggle', 'Toggle', 'input', 'exec' as PinCategory),
        pin('StartClosed', 'Start Closed', 'input', 'bool' as PinCategory, { defaultValue: 'false' }),
        pin('Exit', 'Exit', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_FlipFlop':
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
        pin('A', 'A', 'output', 'exec' as PinCategory),
        pin('B', 'B', 'output', 'exec' as PinCategory),
        pin('IsA', 'Is A', 'output', 'bool' as PinCategory),
      ];
    case 'K2Node_Delay':
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
        pin('Duration', 'Duration', 'input', 'real' as PinCategory, { defaultValue: '0.2' }),
        pin('then', '', 'output', 'exec' as PinCategory),
        pin('Completed', 'Completed', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_VariableGet': {
      const varName = title.replace(/^Get\s+/, '');
      return [
        pin(varName, varName, 'output', 'wildcard' as PinCategory),
      ];
    }
    case 'K2Node_VariableSet': {
      const varName = title.replace(/^Set\s+/, '');
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
        pin(varName, varName, 'input', 'wildcard' as PinCategory),
        pin('then', '', 'output', 'exec' as PinCategory),
        pin(varName, varName, 'output', 'wildcard' as PinCategory),
      ];
    }
    // Typed variants — when we know the variable type from sidebar
    case '__K2Node_VariableGet_Typed':
    case '__K2Node_VariableSet_Typed':
      // Handled in addNode via spec.pins — should not reach here
      return null;
    case 'K2Node_Knot':
      return [
        pin('InputPin', '', 'input', 'wildcard' as PinCategory),
        pin('OutputPin', '', 'output', 'wildcard' as PinCategory),
      ];
    case 'K2Node_FunctionEntry':
      return [
        pin('then', '', 'output', 'exec' as PinCategory),
      ];
    case 'K2Node_FunctionResult':
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
      ];
    case 'K2Node_MultiGate':
      return [
        pin('execute', '', 'input', 'exec' as PinCategory),
        pin('Reset', 'Reset', 'input', 'exec' as PinCategory),
        pin('IsRandom', 'Is Random', 'input', 'bool' as PinCategory, { defaultValue: 'false' }),
        pin('Loop', 'Loop', 'input', 'bool' as PinCategory, { defaultValue: 'false' }),
        pin('StartIndex', 'Start Index', 'input', 'int' as PinCategory, { defaultValue: '-1' }),
        pin('Out 0', 'Out 0', 'output', 'exec' as PinCategory),
        pin('Out 1', 'Out 1', 'output', 'exec' as PinCategory),
      ];
    default:
      return null;
  }
}

// Layout constants (from json-to-flow.ts)
const NODE_HEADER_HEIGHT = 30;
const PIN_ROW_HEIGHT = 22;
const NODE_BODY_PADDING = 12;
const MIN_NODE_WIDTH = 160;
const CHAR_WIDTH_PX = 7;
const LABEL_PADDING = 60;

function estimateNodeSize(title: string, pins: UEPin[]): { width: number; height: number } {
  const visiblePins = pins.filter((p) => !p.hidden);
  const inputCount = visiblePins.filter((p) => p.direction === 'input').length;
  const outputCount = visiblePins.filter((p) => p.direction === 'output').length;
  const pinRows = Math.max(inputCount, outputCount);
  const height = NODE_HEADER_HEIGHT + pinRows * PIN_ROW_HEIGHT + NODE_BODY_PADDING;
  const maxLabelLen = Math.max(
    title.length,
    ...visiblePins.map((p) => (p.friendlyName || p.name).length),
  );
  const width = Math.max(MIN_NODE_WIDTH, maxLabelLen * CHAR_WIDTH_PX + LABEL_PADDING);
  return { width, height };
}

/** Infer UE semantic type from nodeClass. */
function inferUEType(nodeClass: string): string {
  if (nodeClass.includes('Event') || nodeClass.includes('CustomEvent')) return 'event';
  if (nodeClass.includes('VariableGet')) return 'variable_get';
  if (nodeClass.includes('VariableSet')) return 'variable_set';
  if (nodeClass.includes('IfThenElse') || nodeClass.includes('ForEach') || nodeClass.includes('Sequence') || nodeClass.includes('DoOnce') || nodeClass.includes('Gate') || nodeClass.includes('FlipFlop') || nodeClass.includes('MultiGate') || nodeClass.includes('Delay')) return 'flow_control';
  if (nodeClass.includes('DynamicCast') || nodeClass.includes('ClassDynamicCast')) return 'cast';
  if (nodeClass.includes('Comment')) return 'comment';
  if (nodeClass.includes('Knot')) return 'reroute';
  return 'call_function';
}

// ─── GraphAPI ─────────────────────────────────────────────────────────────────

export class GraphAPI {
  private getNodes: () => AnyFlowNode[];
  private getEdges: () => BlueprintFlowEdge[];
  private setNodes: (updater: (nodes: AnyFlowNode[]) => AnyFlowNode[]) => void;
  private setEdges: (updater: (edges: BlueprintFlowEdge[]) => BlueprintFlowEdge[]) => void;
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];

  constructor(
    getNodes: () => AnyFlowNode[],
    getEdges: () => BlueprintFlowEdge[],
    setNodes: (updater: (nodes: AnyFlowNode[]) => AnyFlowNode[]) => void,
    setEdges: (updater: (edges: BlueprintFlowEdge[]) => BlueprintFlowEdge[]) => void,
  ) {
    this.getNodes = getNodes;
    this.getEdges = getEdges;
    this.setNodes = setNodes;
    this.setEdges = setEdges;
  }

  // ─── Undo/Redo ──────────────────────────────────────────────────────────────

  private captureState(label: string): void {
    this.undoStack.push({
      label,
      nodes: [...this.getNodes()],
      edges: [...this.getEdges()],
    });
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.redoStack = [];
  }

  /** Capture state for external operations (e.g., node drag start). */
  captureSnapshot(label = 'user action'): void {
    this.captureState(label);
  }

  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    // Save current state to redo
    this.redoStack.push({
      label: entry.label,
      nodes: [...this.getNodes()],
      edges: [...this.getEdges()],
    });
    this.setNodes(() => entry.nodes);
    this.setEdges(() => entry.edges);
    return true;
  }

  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.undoStack.push({
      label: entry.label,
      nodes: [...this.getNodes()],
      edges: [...this.getEdges()],
    });
    this.setNodes(() => entry.nodes);
    this.setEdges(() => entry.edges);
    return true;
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }

  // ─── Layer 1: Delete & Duplicate ────────────────────────────────────────────

  deleteNodes(nodeIds: string[]): CommandResult {
    if (nodeIds.length === 0) return { success: true };
    this.captureState('delete nodes');
    const idSet = new Set(nodeIds);
    this.setNodes((prev) => prev.filter((n) => !idSet.has(n.id)));
    this.setEdges((prev) => prev.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)));
    return { success: true };
  }

  deleteEdges(edgeIds: string[]): CommandResult {
    if (edgeIds.length === 0) return { success: true };
    this.captureState('delete edges');
    const idSet = new Set(edgeIds);
    this.setEdges((prev) => prev.filter((e) => !idSet.has(e.id)));
    return { success: true };
  }

  duplicateNodes(nodeIds: string[]): CommandResult {
    if (nodeIds.length === 0) return { success: true };
    this.captureState('duplicate nodes');
    const nodes = this.getNodes();
    const edges = this.getEdges();
    const idSet = new Set(nodeIds);
    const toDuplicate = nodes.filter((n) => idSet.has(n.id));
    if (toDuplicate.length === 0) return { success: false, error: 'No matching nodes found' };

    const idMap = new Map<string, string>();
    const pinIdMap = new Map<string, string>();
    const newNodes: AnyFlowNode[] = [];
    const createdIds: string[] = [];

    for (const node of toDuplicate) {
      const newId = `${node.id}_copy_${generateGuid().slice(0, 8)}`;
      idMap.set(node.id, newId);
      createdIds.push(newId);

      if (node.type === 'blueprintNode') {
        const bp = node as BlueprintFlowNode;
        const newPins = bp.data.pins.map((pin) => {
          const newPinId = generateGuid();
          pinIdMap.set(pin.id, newPinId);
          return { ...pin, id: newPinId };
        });
        const newNode: BlueprintFlowNode = {
          ...bp,
          id: newId,
          position: { x: bp.position.x + 20, y: bp.position.y + 20 },
          selected: false,
          data: { ...bp.data, nodeGuid: generateGuid(), pins: newPins },
        };
        newNodes.push(newNode);
      } else {
        const comment = node as CommentFlowNode;
        const newNode: CommentFlowNode = {
          ...comment,
          id: newId,
          position: { x: comment.position.x + 20, y: comment.position.y + 20 },
          selected: false,
          data: { ...comment.data, nodeGuid: generateGuid() },
        };
        newNodes.push(newNode);
      }
    }

    // Clone internal edges (both source and target are in the duplicated set)
    const newEdges: BlueprintFlowEdge[] = [];
    for (const edge of edges) {
      if (idMap.has(edge.source) && idMap.has(edge.target)) {
        newEdges.push({
          ...edge,
          id: `e_${generateGuid().slice(0, 12)}`,
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
          sourceHandle: edge.sourceHandle ? (pinIdMap.get(edge.sourceHandle) ?? edge.sourceHandle) : undefined,
          targetHandle: edge.targetHandle ? (pinIdMap.get(edge.targetHandle) ?? edge.targetHandle) : undefined,
          selected: false,
        });
      }
    }

    this.setNodes((prev) => [...prev, ...newNodes]);
    if (newEdges.length > 0) {
      this.setEdges((prev) => [...prev, ...newEdges]);
    }
    return { success: true, createdIds };
  }

  // ─── Layer 2: Connection Drawing ────────────────────────────────────────────

  addEdge(source: string, sourcePin: string, target: string, targetPin: string): CommandResult {
    const nodes = this.getNodes();
    const edges = this.getEdges();

    // Resolve pin IDs from pin names
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    if (!sourceNode || !targetNode) return { success: false, error: 'Source or target node not found' };
    if (sourceNode.type !== 'blueprintNode' || targetNode.type !== 'blueprintNode') {
      return { success: false, error: 'Can only connect blueprint nodes' };
    }

    const srcBp = sourceNode as BlueprintFlowNode;
    const tgtBp = targetNode as BlueprintFlowNode;
    const srcPin = srcBp.data.pins.find((p) => p.name === sourcePin || p.id === sourcePin);
    const tgtPin = tgtBp.data.pins.find((p) => p.name === targetPin || p.id === targetPin);
    if (!srcPin || !tgtPin) return { success: false, error: 'Source or target pin not found' };

    // Use centralized connection validator
    const validation = canConnect(srcPin, tgtPin, source, target, edges);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Determine category from the output pin
    const outPin = srcPin.direction === 'output' ? srcPin : tgtPin;
    const category = outPin.category;

    this.captureState('add edge');

    // If validator says to replace an existing edge (exec output auto-replace), remove it first
    if (validation.replaces) {
      const r = validation.replaces;
      this.setEdges((prev) => prev.filter((e) =>
        !(e.source === r.source && e.sourceHandle === r.sourceHandle &&
          e.target === r.target && e.targetHandle === r.targetHandle),
      ));
    }

    const newEdge: BlueprintFlowEdge = {
      id: `e_${generateGuid().slice(0, 12)}`,
      source,
      sourceHandle: srcPin.id,
      target,
      targetHandle: tgtPin.id,
      type: 'blueprintEdge',
      data: { category },
    };
    this.setEdges((prev) => [...prev, newEdge]);
    return { success: true, createdIds: [newEdge.id] };
  }

  // ─── Layer 3: Node Creation ─────────────────────────────────────────────────

  addNode(spec: NodeSpec): CommandResult {
    this.captureState('add node');
    const nodeGuid = generateGuid();
    const ueType = spec.type ?? inferUEType(spec.nodeClass);

    if (ueType === 'comment') {
      const w = spec.width ?? 400;
      const h = spec.height ?? 200;
      const commentData: CommentNodeData = {
        ueType: 'comment',
        title: spec.title,
        nodeGuid,
        properties: spec.properties ?? {},
      };
      const newNode: CommentFlowNode = {
        id: `${spec.nodeClass}_${nodeGuid.slice(0, 8)}`,
        type: 'commentNode',
        position: spec.position,
        zIndex: -2000,
        dragHandle: '.ueflow-comment-header',
        style: { width: w, height: h },
        initialWidth: w,
        initialHeight: h,
        data: commentData,
      };
      this.setNodes((prev) => [...prev, newNode]);
      return { success: true, createdIds: [newNode.id] };
    }

    let pins: UEPin[] = (spec.pins ?? []).map((p) => normalizeGeneratedPin({
      ...p,
      id: p.id ?? generateGuid(),
    }));

    // Auto-generate pins for known special node classes when none provided
    const shortCls = spec.nodeClass.includes('.') ? spec.nodeClass.split('.').pop()! : spec.nodeClass;
    if (pins.length === 0) {
      const generated = generateSpecialNodePins(shortCls, spec.title);
      if (generated) pins = generated;
    }

    // K2Node_DynamicCast: auto-generate standard cast pins if none provided
    if ((shortCls === 'K2Node_DynamicCast' || shortCls === 'K2Node_ClassDynamicCast') && pins.length === 0) {
      const castTarget = spec.title.replace('Cast To ', '');
      pins = [
        { id: generateGuid(), name: 'execute', friendlyName: '', direction: 'input', category: 'exec' as PinCategory, subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: generateGuid(), name: 'Object', friendlyName: 'Object', direction: 'input', category: 'object' as PinCategory, subCategory: '', subCategoryObject: '/Script/CoreUObject.Object', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: generateGuid(), name: 'then', friendlyName: '', direction: 'output', category: 'exec' as PinCategory, subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: generateGuid(), name: 'CastFailed', friendlyName: 'Cast Failed', direction: 'output', category: 'exec' as PinCategory, subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: generateGuid(), name: `As ${castTarget}`, friendlyName: `As ${castTarget}`, direction: 'output', category: 'object' as PinCategory, subCategory: '', subCategoryObject: `/Script/Engine.${castTarget}`, containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ];
    }

    // K2Node_BreakStruct / K2Node_MakeStruct: auto-generate pins from struct registry
    if ((shortCls === 'K2Node_BreakStruct' || shortCls === 'K2Node_MakeStruct') && pins.length === 0) {
      const structName = spec.properties?.StructType as string | undefined
        ?? spec.title.replace(/^(Break|Make)\s+/, 'F');
      const fields = getStructFields(structName);
      const structPath = getStructPath(structName);
      const isBreak = shortCls === 'K2Node_BreakStruct';
      if (fields.length > 0) {
        // Break: struct input → individual field outputs
        // Make: individual field inputs → struct output
        if (isBreak) {
          pins.push({
            id: generateGuid(), name: structName, friendlyName: structName,
            direction: 'input', category: 'struct' as PinCategory, subCategory: '',
            subCategoryObject: structPath ?? '', containerType: '', defaultValue: '',
            isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false,
          });
          for (const field of fields) {
            pins.push({
              id: generateGuid(), name: field.name, friendlyName: field.name,
              direction: 'output', category: field.category, subCategory: '',
              subCategoryObject: field.subCategoryObject ?? '', containerType: '', defaultValue: '',
              isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false,
            });
          }
        } else {
          for (const field of fields) {
            pins.push({
              id: generateGuid(), name: field.name, friendlyName: field.name,
              direction: 'input', category: field.category, subCategory: '',
              subCategoryObject: field.subCategoryObject ?? '', containerType: '', defaultValue: '',
              isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false,
            });
          }
          pins.push({
            id: generateGuid(), name: structName, friendlyName: structName,
            direction: 'output', category: 'struct' as PinCategory, subCategory: '',
            subCategoryObject: structPath ?? '', containerType: '', defaultValue: '',
            isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false,
          });
        }
      }
    }

    const properties = synthesizeNodePropertiesWithDB(
      spec.nodeClass, spec.title, spec.properties ?? {},
    );

    const size = estimateNodeSize(spec.title, pins);

    // Variable accent color
    let headerAccent: string | undefined;
    if (ueType === 'variable_get' || ueType === 'variable_set') {
      const valuePins = pins.filter(p =>
        !isExecPin(p.category) &&
        (ueType === 'variable_get' ? p.direction === 'output' : p.direction === 'input'),
      );
      if (valuePins.length > 0) {
        headerAccent = getExtendedPinColor(valuePins[0]);
      }
    }

    const nodeData: FlowNodeData = {
      ueType,
      nodeClass: spec.nodeClass,
      nodeGuid,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      properties,
      pins,
      headerAccent,
    };

    const nodeId = `${spec.nodeClass}_${nodeGuid.slice(0, 8)}`;
    const newNode: BlueprintFlowNode = {
      id: nodeId,
      type: 'blueprintNode',
      position: spec.position,
      initialWidth: size.width,
      initialHeight: size.height,
      data: nodeData,
    };
    this.setNodes((prev) => [...prev, newNode]);
    return { success: true, createdIds: [nodeId] };
  }

  addNodeFromSignature(memberName: string, position: { x: number; y: number }): CommandResult {
    const sig = lookupFunction(memberName);
    if (!sig) return { success: false, error: `Unknown function: ${memberName}` };

    const pins: Partial<UEPin>[] = sig.pins.map((sp) => ({
      id: generateGuid(),
      name: sp.name,
      friendlyName: sp.name,
      direction: sp.direction,
      category: sp.category as PinCategory,
      subCategory: sp.subCategory ?? '',
      subCategoryObject: sp.subCategoryObject ?? '',
      containerType: (sp.containerType ?? '') as '' | 'Array' | 'Set' | 'Map',
      defaultValue: sp.defaultValue ?? '',
      isReference: sp.isReference ?? false,
      isConst: sp.isConst ?? false,
    }));

    const nodeClass = sig.isPure ? 'K2Node_CallFunction' : 'K2Node_CallFunction';
    const refStr = `(MemberParent="${sig.memberParent}",MemberName="${sig.memberName}")`;

    return this.addNode({
      nodeClass,
      title: memberName,
      position,
      properties: { FunctionReference: refStr },
      pins,
    });
  }

  /** Create a typed variable get/set node with the correct pin category for the variable type. */
  addVariableNode(varName: string, varType: string, mode: 'get' | 'set', position: { x: number; y: number }): CommandResult {
    const category = classifyPinType(varType) as PinCategory;
    const nodeClass = mode === 'get' ? 'K2Node_VariableGet' : 'K2Node_VariableSet';
    const title = mode === 'get' ? varName : `Set ${varName}`;

    const pins: Partial<UEPin>[] = mode === 'get'
      ? [{ id: generateGuid(), name: varName, friendlyName: varName, direction: 'output' as const, category }]
      : [
          { id: generateGuid(), name: 'execute', friendlyName: '', direction: 'input' as const, category: 'exec' as PinCategory },
          { id: generateGuid(), name: varName, friendlyName: varName, direction: 'input' as const, category },
          { id: generateGuid(), name: 'then', friendlyName: '', direction: 'output' as const, category: 'exec' as PinCategory },
          { id: generateGuid(), name: varName, friendlyName: varName, direction: 'output' as const, category },
        ];

    return this.addNode({ nodeClass, title, position, pins });
  }

  // ─── Layer 4: Property Editing ──────────────────────────────────────────────

  setPinValue(nodeId: string, pinId: string, value: string): CommandResult {
    const node = this.getNodes().find((n) => n.id === nodeId);
    if (!node || node.type !== 'blueprintNode') {
      return { success: false, error: 'Node not found or not a blueprint node' };
    }
    const bp = node as BlueprintFlowNode;
    const pin = bp.data.pins.find((p) => p.id === pinId || p.name === pinId);
    if (!pin) return { success: false, error: 'Pin not found' };

    this.captureState('set pin value');
    const resolvedPinId = pin.id;
    this.setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || n.type !== 'blueprintNode') return n;
        const b = n as BlueprintFlowNode;
        const updatedPins = b.data.pins.map((p) =>
          p.id === resolvedPinId ? { ...p, defaultValue: value } : p,
        );
        return { ...b, data: { ...b.data, pins: updatedPins } };
      }),
    );
    return { success: true };
  }

  setNodeProperty(nodeId: string, key: string, value: unknown): CommandResult {
    const node = this.getNodes().find((n) => n.id === nodeId);
    if (!node) return { success: false, error: 'Node not found' };

    this.captureState('set node property');
    this.setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        if (n.type === 'blueprintNode') {
          const bp = n as BlueprintFlowNode;
          return { ...bp, data: { ...bp.data, properties: { ...bp.data.properties, [key]: value } } };
        }
        if (n.type === 'commentNode') {
          const c = n as CommentFlowNode;
          return { ...c, data: { ...c.data, properties: { ...c.data.properties, [key]: value } } };
        }
        return n;
      }),
    );
    return { success: true };
  }

  setNodeTitle(nodeId: string, title: string): CommandResult {
    const node = this.getNodes().find((n) => n.id === nodeId);
    if (!node) return { success: false, error: 'Node not found' };

    this.captureState('set node title');
    this.setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        if (n.type === 'blueprintNode') {
          const bp = n as BlueprintFlowNode;
          return { ...bp, data: { ...bp.data, title } };
        }
        if (n.type === 'commentNode') {
          const c = n as CommentFlowNode;
          return { ...c, data: { ...c.data, title } };
        }
        return n;
      }),
    );
    return { success: true };
  }

  // ─── Dynamic Pins ──────────────────────────────────────────────────────────

  addDynamicPin(nodeId: string): CommandResult {
    const node = this.getNodes().find((n) => n.id === nodeId);
    if (!node || node.type !== 'blueprintNode') {
      return { success: false, error: 'Node not found' };
    }
    const bp = node as BlueprintFlowNode;
    const shortClass = bp.data.nodeClass.includes('.') ? bp.data.nodeClass.split('.').pop()! : bp.data.nodeClass;
    const config = DYNAMIC_PIN_CLASSES.get(shortClass);
    if (!config) return { success: false, error: 'Node does not support dynamic pins' };

    this.captureState('add dynamic pin');
    const newPin = generateNextPin(bp.data.pins, config);
    this.setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || n.type !== 'blueprintNode') return n;
        const b = n as BlueprintFlowNode;
        return { ...b, data: { ...b.data, pins: [...b.data.pins, newPin] } };
      }),
    );
    return { success: true, createdIds: [newPin.id] };
  }

  removeDynamicPin(nodeId: string, pinId: string): CommandResult {
    const node = this.getNodes().find((n) => n.id === nodeId);
    if (!node || node.type !== 'blueprintNode') {
      return { success: false, error: 'Node not found' };
    }
    const bp = node as BlueprintFlowNode;
    const shortClass = bp.data.nodeClass.includes('.') ? bp.data.nodeClass.split('.').pop()! : bp.data.nodeClass;
    const config = DYNAMIC_PIN_CLASSES.get(shortClass);
    if (!config) return { success: false, error: 'Node does not support dynamic pins' };
    if (!canRemovePin(bp.data.pins, config)) {
      return { success: false, error: 'Cannot remove pin: minimum reached' };
    }

    this.captureState('remove dynamic pin');
    // Remove pin and any connected edges
    this.setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || n.type !== 'blueprintNode') return n;
        const b = n as BlueprintFlowNode;
        return { ...b, data: { ...b.data, pins: b.data.pins.filter((p) => p.id !== pinId) } };
      }),
    );
    this.setEdges((prev) =>
      prev.filter((e) =>
        !(e.source === nodeId && e.sourceHandle === pinId) &&
        !(e.target === nodeId && e.targetHandle === pinId),
      ),
    );
    return { success: true };
  }

  // ─── Paste (bulk insert) ────────────────────────────────────────────────────

  /** Bulk-insert nodes and edges with a single undo entry. */
  pasteNodes(nodes: AnyFlowNode[], edges: BlueprintFlowEdge[]): CommandResult {
    if (nodes.length === 0) return { success: true };
    this.captureState('paste');
    const createdIds = nodes.map((n) => n.id);
    this.setNodes((prev) => [...prev, ...nodes]);
    if (edges.length > 0) {
      this.setEdges((prev) => [...prev, ...edges]);
    }
    return { success: true, createdIds };
  }

  // ─── Annotations ────────────────────────────────────────────────────────────

  setNodeAnnotation(nodeId: string, text: string): CommandResult {
    const node = this.getNodes().find((n) => n.id === nodeId);
    if (!node || node.type !== 'blueprintNode') {
      return { success: false, error: 'Node not found or not a blueprint node' };
    }
    this.captureState('set annotation');
    this.setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || n.type !== 'blueprintNode') return n;
        const bp = n as BlueprintFlowNode;
        return { ...bp, data: { ...bp.data, annotation: text || undefined } };
      }),
    );
    return { success: true };
  }

  // ─── Move ───────────────────────────────────────────────────────────────────

  moveNodes(moves: Array<{ nodeId: string; position: { x: number; y: number } }>): CommandResult {
    if (moves.length === 0) return { success: true };
    // Note: captureState should be called BEFORE the drag starts (on drag start).
    // This method is called on drag stop to finalize — no additional snapshot needed.
    this.setNodes((prev) =>
      prev.map((n) => {
        const move = moves.find((m) => m.nodeId === n.id);
        return move ? { ...n, position: move.position } : n;
      }),
    );
    return { success: true };
  }

  // ─── Reroute ────────────────────────────────────────────────────────────────

  /** Insert a reroute node on an existing edge, splitting it into two edges. */
  insertRerouteNode(edgeId: string, position: { x: number; y: number }): CommandResult {
    const edges = this.getEdges();
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return { success: false, error: 'Edge not found' };

    const category = edge.data?.category ?? 'exec';

    this.captureState('insert reroute');

    const nodeGuid = generateGuid();
    const inputPinId = generateGuid();
    const outputPinId = generateGuid();

    const pins: UEPin[] = [
      {
        id: inputPinId, name: 'InputPin', friendlyName: '',
        direction: 'input', category, subCategory: '', subCategoryObject: '',
        containerType: '', defaultValue: '', isReference: false, isConst: false,
        isWeak: false, hidden: false, advancedView: false,
      },
      {
        id: outputPinId, name: 'OutputPin', friendlyName: '',
        direction: 'output', category, subCategory: '', subCategoryObject: '',
        containerType: '', defaultValue: '', isReference: false, isConst: false,
        isWeak: false, hidden: false, advancedView: false,
      },
    ];

    const nodeId = `K2Node_Knot_${nodeGuid.slice(0, 8)}`;
    const newNode: BlueprintFlowNode = {
      id: nodeId,
      type: 'blueprintNode',
      position,
      initialWidth: 16,
      initialHeight: 16,
      data: {
        ueType: 'reroute',
        nodeClass: 'K2Node_Knot',
        nodeGuid,
        title: 'Reroute',
        properties: {},
        pins,
      },
    };

    // Replace original edge with two edges: source→reroute, reroute→target
    const edge1: BlueprintFlowEdge = {
      id: `e_${generateGuid().slice(0, 12)}`,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: nodeId,
      targetHandle: inputPinId,
      type: 'blueprintEdge',
      data: { category },
    };
    const edge2: BlueprintFlowEdge = {
      id: `e_${generateGuid().slice(0, 12)}`,
      source: nodeId,
      sourceHandle: outputPinId,
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: 'blueprintEdge',
      data: { category },
    };

    this.setNodes((prev) => [...prev, newNode]);
    this.setEdges((prev) => [...prev.filter((e) => e.id !== edgeId), edge1, edge2]);

    return { success: true, createdIds: [nodeId] };
  }

  // ─── Query (read-only) ──────────────────────────────────────────────────────

  findNodesByTitle(query: string): AnyFlowNode[] {
    const q = query.toLowerCase();
    return this.getNodes().filter((n) => {
      if (n.type === 'blueprintNode') {
        return ((n as BlueprintFlowNode).data.title ?? '').toLowerCase().includes(q);
      }
      if (n.type === 'commentNode') {
        return ((n as CommentFlowNode).data.title ?? '').toLowerCase().includes(q);
      }
      return false;
    });
  }

  getNode(nodeId: string): AnyFlowNode | undefined {
    return this.getNodes().find((n) => n.id === nodeId);
  }

  getEdge(edgeId: string): BlueprintFlowEdge | undefined {
    return this.getEdges().find((e) => e.id === edgeId);
  }

  getConnectedPins(nodeId: string, pinName: string): ConnectionInfo[] {
    const node = this.getNodes().find((n) => n.id === nodeId);
    if (!node || node.type !== 'blueprintNode') return [];
    const bp = node as BlueprintFlowNode;
    const pin = bp.data.pins.find((p) => p.name === pinName || p.id === pinName);
    if (!pin) return [];

    const connections: ConnectionInfo[] = [];
    const edges = this.getEdges();
    const nodes = this.getNodes();

    for (const edge of edges) {
      if (edge.source === nodeId && edge.sourceHandle === pin.id) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode?.type === 'blueprintNode') {
          const tgtBp = targetNode as BlueprintFlowNode;
          const tgtPin = tgtBp.data.pins.find((p) => p.id === edge.targetHandle);
          if (tgtPin) {
            connections.push({ nodeId: edge.target, pinName: tgtPin.name, pinId: tgtPin.id, direction: 'input' });
          }
        }
      }
      if (edge.target === nodeId && edge.targetHandle === pin.id) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === 'blueprintNode') {
          const srcBp = sourceNode as BlueprintFlowNode;
          const srcPin = srcBp.data.pins.find((p) => p.id === edge.sourceHandle);
          if (srcPin) {
            connections.push({ nodeId: edge.source, pinName: srcPin.name, pinId: srcPin.id, direction: 'output' });
          }
        }
      }
    }
    return connections;
  }

  /** Get all selected node IDs. */
  getSelectedNodeIds(): string[] {
    return this.getNodes().filter((n) => n.selected).map((n) => n.id);
  }

  /** Get all selected edge IDs. */
  getSelectedEdgeIds(): string[] {
    return this.getEdges().filter((e) => e.selected).map((e) => e.id);
  }

  // ─── Batch execution ────────────────────────────────────────────────────────

  executeBatch(commands: GraphCommand[]): BatchResult {
    if (commands.length === 0) return { results: [], allSucceeded: true };

    // Capture a single snapshot before the entire batch
    this.captureState('batch');
    // Remove the auto-capture that individual commands would do —
    // we pop the last entry since each method will push its own.
    // Instead, we manually handle: each method pushes an entry, but we only want one.
    // Simplest: just let each command push, then collapse the stack.
    const stackSizeBefore = this.undoStack.length;

    const results: CommandResult[] = [];
    for (const cmd of commands) {
      const result = this.executeCommand(cmd);
      results.push(result);
    }

    // Collapse all undo entries from this batch into the one we captured
    if (this.undoStack.length > stackSizeBefore) {
      // Keep only the first entry (our batch snapshot), remove intermediate ones
      this.undoStack.splice(stackSizeBefore);
    }

    return {
      results,
      allSucceeded: results.every((r) => r.success),
    };
  }

  private executeCommand(cmd: GraphCommand): CommandResult {
    switch (cmd.type) {
      case 'deleteNodes': return this.deleteNodes(cmd.payload.nodeIds);
      case 'deleteEdges': return this.deleteEdges(cmd.payload.edgeIds);
      case 'duplicateNodes': return this.duplicateNodes(cmd.payload.nodeIds);
      case 'addEdge': return this.addEdge(cmd.payload.source, cmd.payload.sourcePin, cmd.payload.target, cmd.payload.targetPin);
      case 'addNode': return this.addNode(cmd.payload);
      case 'addNodeFromSignature': return this.addNodeFromSignature(cmd.payload.memberName, cmd.payload.position);
      case 'setPinValue': return this.setPinValue(cmd.payload.nodeId, cmd.payload.pinId, cmd.payload.value);
      case 'setNodeProperty': return this.setNodeProperty(cmd.payload.nodeId, cmd.payload.key, cmd.payload.value);
      case 'setNodeTitle': return this.setNodeTitle(cmd.payload.nodeId, cmd.payload.title);
      case 'moveNodes': return this.moveNodes(cmd.payload.moves);
      case 'insertRerouteNode': return this.insertRerouteNode(cmd.payload.edgeId, cmd.payload.position);
      default: return { success: false, error: 'Unknown command type' };
    }
  }
}
