import { describe, it, expect } from 'vitest';
import { canConnect, effectiveCategory } from '../connection-validator';
import { GraphAPI } from '../graph-api';
import type { UEPin } from '../../types/ue-graph';
import type { PinCategory } from '../../types/pin-types';
import type { BlueprintFlowNode, BlueprintFlowEdge, AnyFlowNode } from '../../types/flow-types';

function makePin(overrides: Partial<UEPin>): UEPin {
  return {
    id: 'test', name: 'test', friendlyName: 'test',
    direction: 'output', category: 'wildcard' as PinCategory,
    subCategory: '', subCategoryObject: '', containerType: '',
    defaultValue: '', isReference: false, isConst: false,
    isWeak: false, hidden: false, advancedView: false,
    ...overrides,
  };
}

function makeNode(id: string, pins: UEPin[]): BlueprintFlowNode {
  return {
    id,
    type: 'blueprintNode',
    position: { x: 0, y: 0 },
    data: {
      ueType: 'function',
      nodeClass: 'K2Node_MakeArray',
      nodeGuid: 'AAAA0000BBBB1111CCCC2222DDDD3333',
      title: 'Make Array',
      properties: {},
      pins,
    },
  } as BlueprintFlowNode;
}

function makeGraphAPI(nodes: AnyFlowNode[], edges: BlueprintFlowEdge[]) {
  let _nodes = [...nodes];
  let _edges = [...edges];
  return new GraphAPI(
    () => _nodes,
    () => _edges,
    (updater) => { _nodes = updater(_nodes); },
    (updater) => { _edges = updater(_edges); },
  );
}

describe('Wildcard pin type locking', () => {
  it('wildcard connects to any concrete type', () => {
    const src = makePin({ id: 'src', direction: 'output', category: 'wildcard' });
    const tgt = makePin({ id: 'tgt', direction: 'input', category: 'real' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('after connection, sibling wildcards resolve to same type', () => {
    const wildcardOut1 = makePin({ id: 'w1', name: 'elem0', direction: 'output', category: 'wildcard' });
    const wildcardOut2 = makePin({ id: 'w2', name: 'elem1', direction: 'output', category: 'wildcard' });
    const wildcardIn = makePin({ id: 'w3', name: 'ArrayIn', direction: 'input', category: 'wildcard' });
    const concreteIn = makePin({ id: 'c1', name: 'Value', direction: 'input', category: 'real' });

    const arrayNode = makeNode('array1', [wildcardOut1, wildcardOut2, wildcardIn]);
    const consumerNode = makeNode('consumer1', [concreteIn]);

    const api = makeGraphAPI([arrayNode, consumerNode], []);
    // Connect wildcard output to concrete real input
    api.addEdge('array1', 'w1', 'consumer1', 'c1');

    // Check that both wildcard pins on array1 now have resolvedCategory
    const nodes = (api as any).getNodes() as AnyFlowNode[];
    const updatedArrayNode = nodes.find((n) => n.id === 'array1') as BlueprintFlowNode;
    expect(updatedArrayNode.data.pins[0].resolvedCategory).toBe('real');
    expect(updatedArrayNode.data.pins[1].resolvedCategory).toBe('real');
    expect(updatedArrayNode.data.pins[2].resolvedCategory).toBe('real');
  });

  it('resolved wildcard rejects incompatible types', () => {
    const resolvedWildcard = makePin({
      id: 'rw', direction: 'output', category: 'wildcard',
      resolvedCategory: 'real',
    });
    const incompatible = makePin({ id: 'inc', direction: 'input', category: 'string' });
    expect(canConnect(resolvedWildcard, incompatible, 'n1', 'n2').valid).toBe(false);
  });

  it('disconnecting last wire clears resolution', () => {
    const wildcardOut1 = makePin({ id: 'w1', name: 'elem0', direction: 'output', category: 'wildcard' });
    const wildcardOut2 = makePin({ id: 'w2', name: 'elem1', direction: 'output', category: 'wildcard' });
    const concreteIn = makePin({ id: 'c1', name: 'Value', direction: 'input', category: 'real' });

    const arrayNode = makeNode('array1', [wildcardOut1, wildcardOut2]);
    const consumerNode = makeNode('consumer1', [concreteIn]);

    const api = makeGraphAPI([arrayNode, consumerNode], []);
    const result = api.addEdge('array1', 'w1', 'consumer1', 'c1');
    expect(result.success).toBe(true);

    // Verify resolution is set
    let nodes = (api as any).getNodes() as AnyFlowNode[];
    let updated = nodes.find((n) => n.id === 'array1') as BlueprintFlowNode;
    expect(updated.data.pins[0].resolvedCategory).toBe('real');

    // Delete the edge
    const edgeId = result.createdIds![0];
    api.deleteEdges([edgeId]);

    // Verify resolution is cleared
    nodes = (api as any).getNodes() as AnyFlowNode[];
    updated = nodes.find((n) => n.id === 'array1') as BlueprintFlowNode;
    expect(updated.data.pins[0].resolvedCategory).toBeUndefined();
    expect(updated.data.pins[1].resolvedCategory).toBeUndefined();
  });

  it('two unresolved wildcards can connect', () => {
    const src = makePin({ id: 'src', direction: 'output', category: 'wildcard' });
    const tgt = makePin({ id: 'tgt', direction: 'input', category: 'wildcard' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('effectiveCategory returns resolved type for locked wildcard', () => {
    const pin = makePin({
      category: 'wildcard',
      resolvedCategory: 'int',
      resolvedSubCategoryObject: '',
    });
    const eff = effectiveCategory(pin);
    expect(eff.category).toBe('int');
  });

  it('effectiveCategory returns wildcard for unlocked wildcard', () => {
    const pin = makePin({ category: 'wildcard' });
    const eff = effectiveCategory(pin);
    expect(eff.category).toBe('wildcard');
  });
});
