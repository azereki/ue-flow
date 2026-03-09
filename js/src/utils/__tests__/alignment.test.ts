import { describe, it, expect } from 'vitest';
import { alignNodes, distributeNodes, straightenConnection } from '../alignment';

const rect = (id: string, x: number, y: number, w = 160, h = 80) => ({ id, x, y, width: w, height: h });

describe('alignNodes', () => {
  it('aligns left', () => {
    const nodes = [rect('a', 100, 50), rect('b', 300, 100), rect('c', 200, 200)];
    const moves = alignNodes(nodes, 'left');
    expect(moves.every((m) => m.position.x === 100)).toBe(true);
  });

  it('aligns top', () => {
    const nodes = [rect('a', 100, 50), rect('b', 300, 100), rect('c', 200, 200)];
    const moves = alignNodes(nodes, 'top');
    expect(moves.every((m) => m.position.y === 50)).toBe(true);
  });

  it('aligns center-h', () => {
    const nodes = [rect('a', 0, 0, 100, 80), rect('b', 200, 0, 100, 80)];
    const moves = alignNodes(nodes, 'center-h');
    // Average center = (50 + 250) / 2 = 150
    expect(moves[0].position.x).toBe(100); // 150 - 50
    expect(moves[1].position.x).toBe(100); // 150 - 50
  });

  it('returns empty for fewer than 2 nodes', () => {
    expect(alignNodes([rect('a', 0, 0)], 'left')).toEqual([]);
  });
});

describe('distributeNodes', () => {
  it('distributes horizontally', () => {
    const nodes = [rect('a', 0, 0, 100, 80), rect('b', 400, 0, 100, 80), rect('c', 100, 0, 100, 80)];
    const moves = distributeNodes(nodes, 'horizontal');
    // Sorted by x: a(0), c(100), b(400). Total width = 300, totalGap = 500-300=200, gap=100
    expect(moves[0].nodeId).toBe('a');
    expect(moves[0].position.x).toBe(0);
    expect(moves[1].nodeId).toBe('c');
    expect(moves[1].position.x).toBe(200); // 0 + 100 + 100
    expect(moves[2].nodeId).toBe('b');
    expect(moves[2].position.x).toBe(400); // 200 + 100 + 100
  });

  it('returns empty for fewer than 3 nodes', () => {
    expect(distributeNodes([rect('a', 0, 0), rect('b', 100, 0)], 'horizontal')).toEqual([]);
  });
});

describe('straightenConnection', () => {
  it('aligns target Y to source Y', () => {
    const source = rect('src', 100, 200);
    const target = rect('tgt', 400, 300);
    const moves = straightenConnection(source, target);
    expect(moves).toEqual([{ nodeId: 'tgt', position: { x: 400, y: 200 } }]);
  });
});
