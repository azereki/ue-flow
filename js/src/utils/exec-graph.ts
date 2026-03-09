/**
 * Execution flow analysis — find exec roots, reachable nodes, and trace exec paths.
 */
import type { AnyFlowNode, BlueprintFlowEdge, BlueprintFlowNode, FlowNodeData } from '../types/flow-types';
import { isExecPin } from '../types/pin-types';

/** Find all exec root nodes (events, function entries — nodes that start exec flow). */
export function findExecRoots(nodes: AnyFlowNode[]): string[] {
  const rootTypes = new Set(['event', 'function_entry', 'input', 'component_event']);
  return nodes
    .filter((n) => {
      if (n.type !== 'blueprintNode') return false;
      const data = (n as BlueprintFlowNode).data;
      return rootTypes.has(data.ueType);
    })
    .map((n) => n.id);
}

/** Find all nodes reachable from exec roots via exec edges (BFS). */
export function findReachableNodes(
  rootIds: string[],
  nodes: AnyFlowNode[],
  edges: BlueprintFlowEdge[],
): Set<string> {
  // Build adjacency list from exec edges only
  const execAdj = new Map<string, string[]>();
  const nodeMap = new Map<string, AnyFlowNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (const edge of edges) {
    if (edge.data?.category !== 'exec') continue;
    if (!execAdj.has(edge.source)) execAdj.set(edge.source, []);
    execAdj.get(edge.source)!.push(edge.target);
  }

  // BFS from all roots
  const reachable = new Set<string>();
  const queue = [...rootIds];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);

    // Also mark all pure nodes connected to this node's data inputs as reachable
    markDataDependencies(nodeId, nodes, edges, reachable, queue);

    const neighbors = execAdj.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) queue.push(neighbor);
    }
  }

  return reachable;
}

/** Mark pure data-only nodes that feed into a reachable node as also reachable. */
function markDataDependencies(
  nodeId: string,
  nodes: AnyFlowNode[],
  edges: BlueprintFlowEdge[],
  reachable: Set<string>,
  _queue: string[],
): void {
  const dataQueue = [nodeId];
  const visited = new Set<string>();

  while (dataQueue.length > 0) {
    const current = dataQueue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all nodes that feed data INTO this node (non-exec incoming edges)
    for (const edge of edges) {
      if (edge.target !== current) continue;
      if (edge.data?.category === 'exec') continue;

      if (!reachable.has(edge.source)) {
        reachable.add(edge.source);
        dataQueue.push(edge.source);
      }
    }
  }
}

/** Trace the downstream exec path from a starting node. Returns ordered node IDs. */
export function traceExecPath(
  startNodeId: string,
  nodes: AnyFlowNode[],
  edges: BlueprintFlowEdge[],
): string[] {
  const path: string[] = [];
  const visited = new Set<string>();
  let current = startNodeId;

  while (current && !visited.has(current)) {
    visited.add(current);
    path.push(current);

    // Follow the first exec output edge
    const node = nodes.find((n) => n.id === current);
    if (!node || node.type !== 'blueprintNode') break;

    const data = (node as BlueprintFlowNode).data;
    const execOutPin = data.pins.find((p) => p.direction === 'output' && isExecPin(p.category));
    if (!execOutPin) break;

    const nextEdge = edges.find((e) => e.source === current && e.sourceHandle === execOutPin.id);
    if (!nextEdge) break;

    current = nextEdge.target;
  }

  return path;
}
