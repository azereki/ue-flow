import { describe, it, expect, beforeEach } from 'vitest';
import { GraphAPI } from '../graph-api';
import type { AnyFlowNode, BlueprintFlowNode, BlueprintFlowEdge, FlowNodeData } from '../../types/flow-types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(id: string, title: string, pins: FlowNodeData['pins'] = []): BlueprintFlowNode {
  return {
    id,
    type: 'blueprintNode',
    position: { x: 0, y: 0 },
    data: {
      ueType: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'A'.repeat(32),
      title,
      properties: {},
      pins,
    },
  };
}

function makePin(id: string, name: string, direction: 'input' | 'output', category = 'exec' as const) {
  return {
    id, name, friendlyName: name, direction, category,
    subCategory: '', subCategoryObject: '', containerType: '' as const,
    defaultValue: '', isReference: false, isConst: false, isWeak: false,
    hidden: false, advancedView: false,
  };
}

function makeEdge(id: string, source: string, sourceHandle: string, target: string, targetHandle: string): BlueprintFlowEdge {
  return {
    id, source, sourceHandle, target, targetHandle,
    type: 'blueprintEdge',
    data: { category: 'exec' },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GraphAPI', () => {
  let nodes: AnyFlowNode[];
  let edges: BlueprintFlowEdge[];
  let api: GraphAPI;

  beforeEach(() => {
    nodes = [
      makeNode('n1', 'Event BeginPlay', [
        makePin('p1-out', 'then', 'output', 'exec'),
      ]),
      makeNode('n2', 'Print String', [
        makePin('p2-in', 'execute', 'input', 'exec'),
        makePin('p2-out', 'then', 'output', 'exec'),
        makePin('p2-str', 'In String', 'input', 'string'),
      ]),
      makeNode('n3', 'Delay', [
        makePin('p3-in', 'execute', 'input', 'exec'),
        makePin('p3-out', 'Completed', 'output', 'exec'),
        makePin('p3-dur', 'Duration', 'input', 'real'),
      ]),
    ];
    edges = [
      makeEdge('e1', 'n1', 'p1-out', 'n2', 'p2-in'),
    ];
    api = new GraphAPI(
      () => nodes,
      () => edges,
      (updater) => { nodes = updater(nodes); },
      (updater) => { edges = updater(edges); },
    );
  });

  // ─── Delete ───────────────────────────────────────────────────────────────

  describe('deleteNodes', () => {
    it('removes node and connected edges', () => {
      const result = api.deleteNodes(['n2']);
      expect(result.success).toBe(true);
      expect(nodes).toHaveLength(2);
      expect(nodes.find(n => n.id === 'n2')).toBeUndefined();
      expect(edges).toHaveLength(0); // edge e1 referenced n2
    });

    it('handles empty array', () => {
      const result = api.deleteNodes([]);
      expect(result.success).toBe(true);
      expect(nodes).toHaveLength(3);
    });
  });

  describe('deleteEdges', () => {
    it('removes edges by ID', () => {
      const result = api.deleteEdges(['e1']);
      expect(result.success).toBe(true);
      expect(edges).toHaveLength(0);
      expect(nodes).toHaveLength(3); // nodes untouched
    });
  });

  // ─── Duplicate ──────────────────────────────────────────────────────────

  describe('duplicateNodes', () => {
    it('creates copies with new IDs', () => {
      const result = api.duplicateNodes(['n2']);
      expect(result.success).toBe(true);
      expect(result.createdIds).toHaveLength(1);
      expect(nodes).toHaveLength(4);
      const copy = nodes.find(n => n.id === result.createdIds![0]);
      expect(copy).toBeDefined();
      expect(copy!.type).toBe('blueprintNode');
      const data = (copy as BlueprintFlowNode).data;
      expect(data.title).toBe('Print String');
      // New GUID
      expect(data.nodeGuid).not.toBe('A'.repeat(32));
    });

    it('clones internal edges', () => {
      // Add edge n2→n3 so both are in the duplicated set
      edges.push(makeEdge('e2', 'n2', 'p2-out', 'n3', 'p3-in'));
      const result = api.duplicateNodes(['n2', 'n3']);
      expect(result.success).toBe(true);
      expect(result.createdIds).toHaveLength(2);
      // Should have original 2 edges + 1 cloned internal edge
      expect(edges.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ─── Add Edge ──────────────────────────────────────────────────────────

  describe('addEdge', () => {
    it('creates edge between compatible pins', () => {
      const result = api.addEdge('n2', 'then', 'n3', 'execute');
      expect(result.success).toBe(true);
      expect(edges).toHaveLength(2);
    });

    it('rejects self-connection', () => {
      const result = api.addEdge('n2', 'then', 'n2', 'execute');
      expect(result.success).toBe(false);
      expect(result.error).toContain('itself');
    });

    it('rejects duplicate edge', () => {
      api.addEdge('n2', 'then', 'n3', 'execute');
      const result = api.addEdge('n2', 'then', 'n3', 'execute');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('rejects non-existent node', () => {
      const result = api.addEdge('n99', 'then', 'n3', 'execute');
      expect(result.success).toBe(false);
    });
  });

  // ─── Set Pin Value ─────────────────────────────────────────────────────

  describe('setPinValue', () => {
    it('updates pin default value', () => {
      const result = api.setPinValue('n2', 'In String', 'Hello World');
      expect(result.success).toBe(true);
      const pin = (nodes.find(n => n.id === 'n2') as BlueprintFlowNode).data.pins
        .find(p => p.name === 'In String');
      expect(pin?.defaultValue).toBe('Hello World');
    });

    it('resolves by pin ID', () => {
      const result = api.setPinValue('n3', 'p3-dur', '2.0');
      expect(result.success).toBe(true);
    });

    it('rejects non-existent pin', () => {
      const result = api.setPinValue('n2', 'NonExistent', 'x');
      expect(result.success).toBe(false);
    });
  });

  // ─── Set Node Title ────────────────────────────────────────────────────

  describe('setNodeTitle', () => {
    it('updates node title', () => {
      api.setNodeTitle('n2', 'Debug Print');
      const data = (nodes.find(n => n.id === 'n2') as BlueprintFlowNode).data;
      expect(data.title).toBe('Debug Print');
    });
  });

  // ─── Query ─────────────────────────────────────────────────────────────

  describe('findNodesByTitle', () => {
    it('finds nodes by substring match', () => {
      const results = api.findNodesByTitle('Print');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('n2');
    });

    it('returns empty for no match', () => {
      expect(api.findNodesByTitle('Nonexistent')).toHaveLength(0);
    });
  });

  describe('getConnectedPins', () => {
    it('returns connected pins', () => {
      const connections = api.getConnectedPins('n1', 'then');
      expect(connections).toHaveLength(1);
      expect(connections[0].nodeId).toBe('n2');
      expect(connections[0].pinName).toBe('execute');
    });
  });

  // ─── Undo/Redo ─────────────────────────────────────────────────────────

  describe('undo/redo', () => {
    it('undoes a delete operation', () => {
      api.deleteNodes(['n2']);
      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(0);

      api.undo();
      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(1);
    });

    it('redoes after undo', () => {
      api.deleteNodes(['n2']);
      api.undo();
      api.redo();
      expect(nodes).toHaveLength(2);
    });

    it('clears redo stack on new action', () => {
      api.deleteNodes(['n3']);
      api.undo();
      expect(api.canRedo).toBe(true);
      api.deleteNodes(['n2']); // new action
      expect(api.canRedo).toBe(false);
    });
  });

  // ─── Batch ─────────────────────────────────────────────────────────────

  describe('executeBatch', () => {
    it('executes multiple commands', () => {
      const result = api.executeBatch([
        { type: 'setPinValue', payload: { nodeId: 'n2', pinId: 'In String', value: 'Test' } },
        { type: 'addEdge', payload: { source: 'n2', sourcePin: 'then', target: 'n3', targetPin: 'execute' } },
      ]);
      expect(result.allSucceeded).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(edges).toHaveLength(2);
    });

    it('single undo reverses entire batch', () => {
      api.executeBatch([
        { type: 'deleteNodes', payload: { nodeIds: ['n2'] } },
        { type: 'deleteNodes', payload: { nodeIds: ['n3'] } },
      ]);
      expect(nodes).toHaveLength(1);

      api.undo();
      expect(nodes).toHaveLength(3);
    });
  });
});
