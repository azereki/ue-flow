import type { Node, Edge } from '@xyflow/react';
import type { UEGraphJSON, UEPin } from '../types/ue-graph';

export interface FlowNodeData {
  ueType: string;
  nodeClass: string;
  nodeGuid: string;
  title: string;
  description?: string;
  category?: string;
  properties: Record<string, unknown>;
  pins: UEPin[];
  [key: string]: unknown;
}

export function graphJsonToFlow(graph: UEGraphJSON): { nodes: Node[]; edges: Edge[] } {
  const pinIdLookup = buildPinIdLookup(graph);

  const nodes: Node[] = graph.nodes.map((ueNode) => ({
    id: ueNode.id,
    type: ueNode.type === 'comment' ? 'commentNode' : 'blueprintNode',
    position: ueNode.position,
    data: {
      ueType: ueNode.type,
      nodeClass: ueNode.nodeClass,
      nodeGuid: ueNode.nodeGuid,
      title: ueNode.title,
      description: ueNode.description,
      category: ueNode.category,
      properties: ueNode.properties,
      pins: ueNode.pins,
    } satisfies FlowNodeData,
  }));

  const edges: Edge[] = graph.edges.map((ueEdge) => ({
    id: ueEdge.id,
    source: ueEdge.source,
    sourceHandle: pinIdLookup.get(`${ueEdge.source}:${ueEdge.sourcePin}`) ?? ueEdge.sourcePin,
    target: ueEdge.target,
    targetHandle: pinIdLookup.get(`${ueEdge.target}:${ueEdge.targetPin}`) ?? ueEdge.targetPin,
    type: 'blueprintEdge',
    data: { category: ueEdge.category },
  }));

  return { nodes, edges };
}

function buildPinIdLookup(graph: UEGraphJSON): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const node of graph.nodes) {
    for (const pin of node.pins) {
      lookup.set(`${node.id}:${pin.name}`, pin.id);
    }
  }
  return lookup;
}
