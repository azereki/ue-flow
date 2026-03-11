import { describe, it, expect } from 'vitest';
import { serializeSelection, deserializeClipboard } from '../clipboard';
import type { BlueprintFlowNode, BlueprintFlowEdge, AnyFlowNode } from '../../types/flow-types';

function makeBpNode(id: string, pins: Array<{ id: string; name: string }> = [], x = 0, y = 0): BlueprintFlowNode {
  return {
    id,
    type: 'blueprintNode',
    position: { x, y },
    data: {
      ueType: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'AAAA0000BBBB1111CCCC2222DDDD3333',
      title: `Node ${id}`,
      properties: {},
      pins: pins.map((p) => ({
        id: p.id,
        name: p.name,
        friendlyName: p.name,
        direction: 'output' as const,
        category: 'exec' as const,
        subCategory: '',
        subCategoryObject: '',
        containerType: '' as const,
        defaultValue: '',
        isReference: false,
        isConst: false,
        isWeak: false,
        hidden: false,
        advancedView: false,
      })),
    },
  };
}

function makeEdge(id: string, source: string, target: string, sourceHandle?: string, targetHandle?: string): BlueprintFlowEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'blueprintEdge',
    data: { category: 'exec' },
  };
}

describe('serializeSelection', () => {
  it('serializes a single node', () => {
    const nodes: AnyFlowNode[] = [makeBpNode('n1')];
    const json = serializeSelection(['n1'], nodes, []);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe('ueflow-clipboard');
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.edges).toHaveLength(0);
  });

  it('serializes multiple selected nodes', () => {
    const nodes: AnyFlowNode[] = [makeBpNode('n1'), makeBpNode('n2'), makeBpNode('n3')];
    const json = serializeSelection(['n1', 'n3'], nodes, []);
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.nodes.map((n: { id: string }) => n.id)).toEqual(['n1', 'n3']);
  });

  it('includes edges between selected nodes', () => {
    const nodes: AnyFlowNode[] = [makeBpNode('n1', [{ id: 'p1', name: 'out' }]), makeBpNode('n2', [{ id: 'p2', name: 'in' }])];
    const edges: BlueprintFlowEdge[] = [makeEdge('e1', 'n1', 'n2', 'p1', 'p2')];
    const json = serializeSelection(['n1', 'n2'], nodes, edges);
    const parsed = JSON.parse(json);
    expect(parsed.edges).toHaveLength(1);
  });

  it('excludes edges to external nodes', () => {
    const nodes: AnyFlowNode[] = [makeBpNode('n1'), makeBpNode('n2'), makeBpNode('n3')];
    const edges: BlueprintFlowEdge[] = [
      makeEdge('e1', 'n1', 'n2'),
      makeEdge('e2', 'n2', 'n3'),
    ];
    // Only select n1 and n2 — edge to n3 should be excluded
    const json = serializeSelection(['n1', 'n2'], nodes, edges);
    const parsed = JSON.parse(json);
    expect(parsed.edges).toHaveLength(1);
    expect(parsed.edges[0].id).toBe('e1');
  });
});

describe('deserializeClipboard', () => {
  it('returns null for invalid JSON', () => {
    expect(deserializeClipboard('not json', { x: 0, y: 0 })).toBeNull();
  });

  it('returns null for wrong format', () => {
    expect(deserializeClipboard('{"format":"other"}', { x: 0, y: 0 })).toBeNull();
  });

  it('returns null for empty nodes array', () => {
    const data = JSON.stringify({ format: 'ueflow-clipboard', nodes: [], edges: [] });
    expect(deserializeClipboard(data, { x: 0, y: 0 })).toBeNull();
  });

  it('remaps node IDs to new unique values', () => {
    const nodes: AnyFlowNode[] = [makeBpNode('n1', [{ id: 'p1', name: 'out' }])];
    const json = serializeSelection(['n1'], nodes, []);
    const result = deserializeClipboard(json, { x: 100, y: 200 });
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(1);
    expect(result!.nodes[0].id).not.toBe('n1');
    expect(result!.nodes[0].id).toContain('n1'); // keeps original as prefix
  });

  it('remaps pin IDs to new 32-char hex GUIDs', () => {
    const nodes: AnyFlowNode[] = [makeBpNode('n1', [{ id: 'AAAA0000BBBB1111CCCC2222DDDD3333', name: 'out' }])];
    const json = serializeSelection(['n1'], nodes, []);
    const result = deserializeClipboard(json, { x: 0, y: 0 });
    const newNode = result!.nodes[0] as BlueprintFlowNode;
    const newPinId = newNode.data.pins[0].id;
    expect(newPinId).not.toBe('AAAA0000BBBB1111CCCC2222DDDD3333');
    expect(newPinId).toMatch(/^[0-9A-F]{32}$/);
  });

  it('generates new nodeGuids after deserialization', () => {
    const nodes: AnyFlowNode[] = [makeBpNode('n1')];
    const json = serializeSelection(['n1'], nodes, []);
    const result = deserializeClipboard(json, { x: 0, y: 0 });
    const newNode = result!.nodes[0] as BlueprintFlowNode;
    expect(newNode.data.nodeGuid).not.toBe('AAAA0000BBBB1111CCCC2222DDDD3333');
    expect(newNode.data.nodeGuid).toMatch(/^[0-9A-F]{32}$/);
  });

  it('round-trip produces structurally equivalent but ID-distinct graph', () => {
    const nodes: AnyFlowNode[] = [
      makeBpNode('n1', [{ id: 'A'.repeat(32), name: 'out' }], 50, 100),
      makeBpNode('n2', [{ id: 'B'.repeat(32), name: 'in' }], 200, 100),
    ];
    const edges: BlueprintFlowEdge[] = [makeEdge('e1', 'n1', 'n2', 'A'.repeat(32), 'B'.repeat(32))];
    const json = serializeSelection(['n1', 'n2'], nodes, edges);
    const result = deserializeClipboard(json, { x: 50, y: 100 });

    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(2);
    expect(result!.edges).toHaveLength(1);

    // IDs are different
    const ids = result!.nodes.map((n) => n.id);
    expect(ids).not.toContain('n1');
    expect(ids).not.toContain('n2');

    // Edge references updated to new node IDs
    const edge = result!.edges[0];
    expect(ids).toContain(edge.source);
    expect(ids).toContain(edge.target);
  });

  it('offsets positions to target position', () => {
    const nodes: AnyFlowNode[] = [
      makeBpNode('n1', [], 100, 200),
      makeBpNode('n2', [], 300, 200),
    ];
    const json = serializeSelection(['n1', 'n2'], nodes, []);
    const result = deserializeClipboard(json, { x: 500, y: 500 });

    // n1 was at (100,200) which is the min. Target is (500,500), offset is +400,+300
    expect(result!.nodes[0].position).toEqual({ x: 500, y: 500 });
    expect(result!.nodes[1].position).toEqual({ x: 700, y: 500 });
  });
});
