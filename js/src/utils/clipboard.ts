/**
 * Clipboard utilities for copy/paste of Blueprint nodes.
 * Supports both internal JSON format (cross-graph) and T3D text (UE interop).
 */
import type { AnyFlowNode, BlueprintFlowEdge, BlueprintFlowNode, FlowNodeData, CommentFlowNode } from '../types/flow-types';
import type { UEPin } from '../types/ue-graph';

/** Internal clipboard format. */
interface ClipboardData {
  format: 'ueflow-clipboard';
  nodes: AnyFlowNode[];
  edges: BlueprintFlowEdge[];
}

/** Generate a 32-char uppercase hex GUID. */
function generateGuid(): string {
  const hex = '0123456789ABCDEF';
  let guid = '';
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)];
  return guid;
}

/**
 * Serialize selected nodes and their interconnecting edges.
 * Returns a JSON string in internal clipboard format.
 */
export function serializeSelection(
  selectedNodeIds: string[],
  allNodes: AnyFlowNode[],
  allEdges: BlueprintFlowEdge[],
): string {
  const idSet = new Set(selectedNodeIds);
  const nodes = allNodes.filter((n) => idSet.has(n.id));

  // Only include edges where both source and target are in the selection
  const edges = allEdges.filter((e) => idSet.has(e.source) && idSet.has(e.target));

  const data: ClipboardData = { format: 'ueflow-clipboard', nodes, edges };
  return JSON.stringify(data);
}

/**
 * Deserialize clipboard content into nodes and edges with new GUIDs.
 * Remaps all node IDs, pin IDs, and edge references.
 */
export function deserializeClipboard(
  data: string,
  targetPosition: { x: number; y: number },
): { nodes: AnyFlowNode[]; edges: BlueprintFlowEdge[] } | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.format !== 'ueflow-clipboard') return null;

    const clipboard = parsed as ClipboardData;
    if (!clipboard.nodes || clipboard.nodes.length === 0) return null;

    // Compute offset from original positions
    const minX = Math.min(...clipboard.nodes.map((n) => n.position.x));
    const minY = Math.min(...clipboard.nodes.map((n) => n.position.y));
    const offsetX = targetPosition.x - minX;
    const offsetY = targetPosition.y - minY;

    // Build ID mappings
    const nodeIdMap = new Map<string, string>();
    const pinIdMap = new Map<string, string>();

    for (const node of clipboard.nodes) {
      nodeIdMap.set(node.id, `${node.id}_paste_${generateGuid().slice(0, 8)}`);

      if (node.type === 'blueprintNode') {
        const bp = node as BlueprintFlowNode;
        for (const pin of bp.data.pins) {
          pinIdMap.set(pin.id, generateGuid());
        }
      }
    }

    // Create new nodes with remapped IDs
    const newNodes: AnyFlowNode[] = clipboard.nodes.map((node) => {
      const newId = nodeIdMap.get(node.id)!;
      const newPos = { x: node.position.x + offsetX, y: node.position.y + offsetY };

      if (node.type === 'blueprintNode') {
        const bp = node as BlueprintFlowNode;
        const newPins: UEPin[] = bp.data.pins.map((pin) => ({
          ...pin,
          id: pinIdMap.get(pin.id) ?? generateGuid(),
        }));
        const newData: FlowNodeData = {
          ...bp.data,
          nodeGuid: generateGuid(),
          pins: newPins,
        };
        return { ...bp, id: newId, position: newPos, selected: false, data: newData } as BlueprintFlowNode;
      }

      // Comment node
      const comment = node as CommentFlowNode;
      return {
        ...comment,
        id: newId,
        position: newPos,
        selected: false,
        data: { ...comment.data, nodeGuid: generateGuid() },
      } as CommentFlowNode;
    });

    // Create new edges with remapped references
    const newEdges: BlueprintFlowEdge[] = clipboard.edges
      .filter((e) => nodeIdMap.has(e.source) && nodeIdMap.has(e.target))
      .map((edge) => ({
        ...edge,
        id: `e_${generateGuid().slice(0, 12)}`,
        source: nodeIdMap.get(edge.source)!,
        target: nodeIdMap.get(edge.target)!,
        sourceHandle: edge.sourceHandle ? (pinIdMap.get(edge.sourceHandle) ?? edge.sourceHandle) : undefined,
        targetHandle: edge.targetHandle ? (pinIdMap.get(edge.targetHandle) ?? edge.targetHandle) : undefined,
        selected: false,
      }));

    return { nodes: newNodes, edges: newEdges };
  } catch {
    return null;
  }
}
