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

  // Auto-pad comment nodes to encompass their children.
  // Uses overlap detection (any part of node touches comment) rather than center-based,
  // so nodes at edges are included. Padding ensures no node overflows the comment border.
  const commentNodes = nodes.filter((n) => (n.data as FlowNodeData).ueType === 'comment');
  const regularNodes = nodes.filter((n) => (n.data as FlowNodeData).ueType !== 'comment');
  const COMMENT_PAD_X = 50;     // horizontal padding from child edge to comment edge
  const COMMENT_PAD_BOTTOM = 50; // bottom padding
  const COMMENT_HEADER = 60;     // space above topmost child (includes header height)

  for (const comment of commentNodes) {
    const cx = comment.position.x;
    const cy = comment.position.y;
    const cw = comment.initialWidth ?? DEFAULT_COMMENT_WIDTH;
    const ch = comment.initialHeight ?? DEFAULT_COMMENT_HEIGHT;

    // Find children that overlap with the original comment bounds (any intersection)
    const children = regularNodes.filter((n) => {
      const nw = n.initialWidth ?? MIN_NODE_WIDTH;
      const nh = n.initialHeight ?? 42;
      const nx = n.position.x;
      const ny = n.position.y;
      // AABB overlap: node rect intersects comment rect
      return nx + nw > cx && nx < cx + cw && ny + nh > cy && ny < cy + ch;
    });

    if (children.length === 0) continue;

    // Compute bounding box of all children (full node bounds, not centers)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const child of children) {
      const nw = child.initialWidth ?? MIN_NODE_WIDTH;
      const nh = child.initialHeight ?? 42;
      minX = Math.min(minX, child.position.x);
      minY = Math.min(minY, child.position.y);
      maxX = Math.max(maxX, child.position.x + nw);
      maxY = Math.max(maxY, child.position.y + nh);
    }

    // Expand comment bounds to encompass all children + padding (only expand, never shrink)
    const newX = Math.min(cx, minX - COMMENT_PAD_X);
    const newY = Math.min(cy, minY - COMMENT_HEADER);
    const newRight = Math.max(cx + cw, maxX + COMMENT_PAD_X);
    const newBottom = Math.max(cy + ch, maxY + COMMENT_PAD_BOTTOM);
    const newW = newRight - newX;
    const newH = newBottom - newY;

    comment.position = { x: newX, y: newY };
    comment.initialWidth = newW;
    comment.initialHeight = newH;
    comment.style = { ...(comment.style as Record<string, unknown> ?? {}), width: newW, height: newH };
  }

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
