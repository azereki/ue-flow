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

function estimateNodeSize(ueNode: UEGraphJSON['nodes'][0]): { width: number; height: number } {
  if (ueNode.type === 'comment') {
    const w = Number(ueNode.properties?.NodeWidth) || 400;
    const h = Number(ueNode.properties?.NodeHeight) || 200;
    return { width: w, height: h };
  }
  if (ueNode.type === 'reroute') {
    return { width: 16, height: 16 };
  }
  const visiblePins = ueNode.pins.filter((p) => !p.hidden);
  const inputCount = visiblePins.filter((p) => p.direction === 'input').length;
  const outputCount = visiblePins.filter((p) => p.direction === 'output').length;
  const pinRows = Math.max(inputCount, outputCount);
  const headerHeight = 30;
  const pinRowHeight = 22;
  const height = headerHeight + pinRows * pinRowHeight + 12;
  const maxLabelLen = Math.max(
    ueNode.title.length,
    ...visiblePins.map((p) => (p.friendlyName || p.name).length),
  );
  const width = Math.max(160, maxLabelLen * 7 + 60);
  return { width, height };
}

export function graphJsonToFlow(graph: UEGraphJSON): { nodes: Node[]; edges: Edge[] } {
  const pinIdLookup = buildPinIdLookup(graph);

  const nodes: Node[] = graph.nodes.map((ueNode) => {
    const size = estimateNodeSize(ueNode);
    return {
      id: ueNode.id,
      type: ueNode.type === 'comment' ? 'commentNode' : 'blueprintNode',
      position: ueNode.position,
      ...(ueNode.type === 'comment' ? { zIndex: -1 } : {}),
      initialWidth: size.width,
      initialHeight: size.height,
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
    };
  });

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
