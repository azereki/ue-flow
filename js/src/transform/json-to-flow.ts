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

// Layout constants for node size estimation.
// These must stay in sync with CSS: .ueflow-node-header height and .ueflow-pin min-height.
const NODE_HEADER_HEIGHT = 30;
const PIN_ROW_HEIGHT = 22;
const NODE_BODY_PADDING = 12;
const MIN_NODE_WIDTH = 160;
const CHAR_WIDTH_PX = 7;
const LABEL_PADDING = 60;
const REROUTE_SIZE = 16;
const DEFAULT_COMMENT_WIDTH = 400;
const DEFAULT_COMMENT_HEIGHT = 200;

function estimateNodeSize(ueNode: UEGraphJSON['nodes'][0]): { width: number; height: number } {
  if (ueNode.type === 'comment') {
    const w = Number(ueNode.properties?.NodeWidth) || DEFAULT_COMMENT_WIDTH;
    const h = Number(ueNode.properties?.NodeHeight) || DEFAULT_COMMENT_HEIGHT;
    return { width: w, height: h };
  }
  if (ueNode.type === 'reroute') {
    return { width: REROUTE_SIZE, height: REROUTE_SIZE };
  }
  const visiblePins = ueNode.pins.filter((p) => !p.hidden);
  const inputCount = visiblePins.filter((p) => p.direction === 'input').length;
  const outputCount = visiblePins.filter((p) => p.direction === 'output').length;
  const pinRows = Math.max(inputCount, outputCount);
  const height = NODE_HEADER_HEIGHT + pinRows * PIN_ROW_HEIGHT + NODE_BODY_PADDING;
  const maxLabelLen = Math.max(
    ueNode.title.length,
    ...visiblePins.map((p) => (p.friendlyName || p.name).length),
  );
  const width = Math.max(MIN_NODE_WIDTH, maxLabelLen * CHAR_WIDTH_PX + LABEL_PADDING);
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
      ...(ueNode.type === 'comment'
        ? { zIndex: -2000, style: { width: size.width, height: size.height } }
        : {}),
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
