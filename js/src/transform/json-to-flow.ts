import type { UEGraphJSON } from '../types/ue-graph';
import type { BlueprintFlowNode, CommentFlowNode, AnyFlowNode, BlueprintFlowEdge, FlowNodeData, CommentNodeData } from '../types/flow-types';
import { getExtendedPinColor, isExecPin } from '../types/pin-types';

// Re-export FlowNodeData so existing importers don't need to change their import paths.
export type { FlowNodeData } from '../types/flow-types';

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

export function graphJsonToFlow(graph: UEGraphJSON): { nodes: AnyFlowNode[]; edges: BlueprintFlowEdge[] } {
  const pinIdLookup = buildPinIdLookup(graph);

  const nodes: AnyFlowNode[] = graph.nodes.map((ueNode) => {
    const size = estimateNodeSize(ueNode);

    if (ueNode.type === 'comment') {
      const commentData: CommentNodeData = {
        ueType: 'comment',
        title: ueNode.title,
        nodeGuid: ueNode.nodeGuid,
        properties: ueNode.properties,
      };
      const commentNode: CommentFlowNode = {
        id: ueNode.id,
        type: 'commentNode',
        position: ueNode.position,
        zIndex: -2000,
        dragHandle: '.ueflow-comment-header',
        style: { width: size.width, height: size.height },
        initialWidth: size.width,
        initialHeight: size.height,
        data: commentData,
      };
      return commentNode;
    }

    // Variable get/set: tint header accent from the primary value pin's type color.
    // Getter: first non-exec output pin. Setter: first non-exec input pin (the value pin).
    let headerAccent: string | undefined;
    if (ueNode.type === 'variable_get' || ueNode.type === 'variable_set') {
      const valuePins = ueNode.pins.filter(p =>
        !isExecPin(p.category as Parameters<typeof isExecPin>[0]) &&
        (ueNode.type === 'variable_get' ? p.direction === 'output' : p.direction === 'input')
      );
      if (valuePins.length > 0) {
        headerAccent = getExtendedPinColor(valuePins[0] as Parameters<typeof getExtendedPinColor>[0]);
      }
    }

    const nodeData: FlowNodeData = {
      ueType: ueNode.type,
      nodeClass: ueNode.nodeClass,
      nodeGuid: ueNode.nodeGuid,
      title: ueNode.title,
      description: ueNode.description,
      category: ueNode.category,
      properties: ueNode.properties,
      pins: ueNode.pins,
      headerAccent,
      // __setPinValue is injected by SingleGraphView after construction
    };
    const bpNode: BlueprintFlowNode = {
      id: ueNode.id,
      type: 'blueprintNode',
      position: ueNode.position,
      initialWidth: size.width,
      initialHeight: size.height,
      data: nodeData,
    };
    return bpNode;
  });

  // Auto-pad comment nodes to encompass their children.
  // Uses overlap detection (any part of node touches comment) rather than center-based,
  // so nodes at edges are included. Padding ensures no node overflows the comment border.
  const commentNodes = nodes.filter((n): n is CommentFlowNode => n.type === 'commentNode');
  const regularNodes = nodes.filter((n): n is BlueprintFlowNode => n.type === 'blueprintNode');
  const COMMENT_PAD_X = 60;     // horizontal padding from child edge to comment edge
  const COMMENT_PAD_BOTTOM = 60; // bottom padding
  const COMMENT_HEADER = 70;     // space above topmost child (includes header height)

  // Collect comment updates immutably (no in-place mutation of nodes)
  const commentUpdates = new Map<string, { x: number; y: number; w: number; h: number }>();

  for (const comment of commentNodes) {
    const cx = comment.position.x;
    const cy = comment.position.y;
    const cw = comment.initialWidth ?? DEFAULT_COMMENT_WIDTH;
    const ch = comment.initialHeight ?? DEFAULT_COMMENT_HEIGHT;

    // Find children that overlap with the original comment bounds (any intersection)
    const children = regularNodes.filter((n) => {
      const nw = n.initialWidth ?? MIN_NODE_WIDTH;
      const nh = n.initialHeight ?? 80;
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
      const nh = child.initialHeight ?? 80;
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
    commentUpdates.set(comment.id, { x: newX, y: newY, w: newRight - newX, h: newBottom - newY });
  }

  // Apply comment updates immutably
  const finalNodes = commentUpdates.size > 0
    ? nodes.map((n) => {
        const update = commentUpdates.get(n.id);
        if (!update) return n;
        return {
          ...n,
          position: { x: update.x, y: update.y },
          initialWidth: update.w,
          initialHeight: update.h,
          style: { ...(n.style as Record<string, unknown> ?? {}), width: update.w, height: update.h },
        };
      })
    : nodes;

  const edges: BlueprintFlowEdge[] = graph.edges.map((ueEdge) => ({
    id: ueEdge.id,
    source: ueEdge.source,
    sourceHandle: pinIdLookup.get(`${ueEdge.source}:${ueEdge.sourcePin}`) ?? ueEdge.sourcePin,
    target: ueEdge.target,
    targetHandle: pinIdLookup.get(`${ueEdge.target}:${ueEdge.targetPin}`) ?? ueEdge.targetPin,
    type: 'blueprintEdge' as const,
    data: { category: ueEdge.category },
  }));

  return { nodes: finalNodes, edges };
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
