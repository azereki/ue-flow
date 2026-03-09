/**
 * Node alignment and distribution utilities.
 * All functions are pure — they return position moves without mutating inputs.
 */

interface NodeRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AlignMove {
  nodeId: string;
  position: { x: number; y: number };
}

export type AlignAxis = 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v';
export type DistributeAxis = 'horizontal' | 'vertical';

/** Align selected nodes along an axis. */
export function alignNodes(nodes: NodeRect[], axis: AlignAxis): AlignMove[] {
  if (nodes.length < 2) return [];

  switch (axis) {
    case 'left': {
      const minX = Math.min(...nodes.map((n) => n.x));
      return nodes.map((n) => ({ nodeId: n.id, position: { x: minX, y: n.y } }));
    }
    case 'right': {
      const maxRight = Math.max(...nodes.map((n) => n.x + n.width));
      return nodes.map((n) => ({ nodeId: n.id, position: { x: maxRight - n.width, y: n.y } }));
    }
    case 'top': {
      const minY = Math.min(...nodes.map((n) => n.y));
      return nodes.map((n) => ({ nodeId: n.id, position: { x: n.x, y: minY } }));
    }
    case 'bottom': {
      const maxBottom = Math.max(...nodes.map((n) => n.y + n.height));
      return nodes.map((n) => ({ nodeId: n.id, position: { x: n.x, y: maxBottom - n.height } }));
    }
    case 'center-h': {
      const avgCenterX = nodes.reduce((sum, n) => sum + n.x + n.width / 2, 0) / nodes.length;
      return nodes.map((n) => ({ nodeId: n.id, position: { x: avgCenterX - n.width / 2, y: n.y } }));
    }
    case 'center-v': {
      const avgCenterY = nodes.reduce((sum, n) => sum + n.y + n.height / 2, 0) / nodes.length;
      return nodes.map((n) => ({ nodeId: n.id, position: { x: n.x, y: avgCenterY - n.height / 2 } }));
    }
  }
}

/** Distribute nodes evenly along an axis. */
export function distributeNodes(nodes: NodeRect[], axis: DistributeAxis): AlignMove[] {
  if (nodes.length < 3) return [];

  const sorted = [...nodes].sort((a, b) =>
    axis === 'horizontal' ? a.x - b.x : a.y - b.y,
  );

  if (axis === 'horizontal') {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalWidth = sorted.reduce((sum, n) => sum + n.width, 0);
    const totalGap = (last.x + last.width) - first.x - totalWidth;
    const gap = totalGap / (sorted.length - 1);

    let currentX = first.x;
    return sorted.map((n) => {
      const move = { nodeId: n.id, position: { x: currentX, y: n.y } };
      currentX += n.width + gap;
      return move;
    });
  } else {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalHeight = sorted.reduce((sum, n) => sum + n.height, 0);
    const totalGap = (last.y + last.height) - first.y - totalHeight;
    const gap = totalGap / (sorted.length - 1);

    let currentY = first.y;
    return sorted.map((n) => {
      const move = { nodeId: n.id, position: { x: n.x, y: currentY } };
      currentY += n.height + gap;
      return move;
    });
  }
}

/** Straighten connection: align target node's Y to match source node's exec pin level. */
export function straightenConnection(
  sourceNode: NodeRect,
  targetNode: NodeRect,
): AlignMove[] {
  // Align target Y to source Y (straighten the exec wire)
  return [
    { nodeId: targetNode.id, position: { x: targetNode.x, y: sourceNode.y } },
  ];
}
