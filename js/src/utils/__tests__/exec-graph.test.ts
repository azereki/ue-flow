import { describe, it, expect } from 'vitest';
import { findExecRoots, findReachableNodes, traceExecPath } from '../exec-graph';
import type { AnyFlowNode, BlueprintFlowEdge, BlueprintFlowNode } from '../../types/flow-types';

function bpNode(id: string, ueType: string, pins: Array<{ id: string; name: string; direction: 'input' | 'output'; category: string }> = []): BlueprintFlowNode {
  return {
    id,
    type: 'blueprintNode',
    position: { x: 0, y: 0 },
    data: {
      ueType,
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: '00000000000000000000000000000000',
      title: id,
      properties: {},
      pins: pins.map((p) => ({
        ...p,
        friendlyName: p.name,
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

function edge(source: string, sourceHandle: string, target: string, targetHandle: string, category = 'exec'): BlueprintFlowEdge {
  return {
    id: `e_${source}_${target}`,
    source,
    sourceHandle,
    target,
    targetHandle,
    type: 'blueprintEdge',
    data: { category: category as 'exec' },
  };
}

describe('findExecRoots', () => {
  it('finds event nodes', () => {
    const nodes: AnyFlowNode[] = [
      bpNode('event1', 'event'),
      bpNode('func1', 'call_function'),
      bpNode('entry1', 'function_entry'),
    ];
    const roots = findExecRoots(nodes);
    expect(roots).toEqual(['event1', 'entry1']);
  });
});

describe('findReachableNodes', () => {
  it('marks nodes on exec chain as reachable', () => {
    const nodes: AnyFlowNode[] = [
      bpNode('event1', 'event', [{ id: 'out', name: 'then', direction: 'output', category: 'exec' }]),
      bpNode('func1', 'call_function', [{ id: 'in', name: 'execute', direction: 'input', category: 'exec' }]),
      bpNode('orphan', 'call_function'),
    ];
    const edges: BlueprintFlowEdge[] = [
      edge('event1', 'out', 'func1', 'in'),
    ];
    const reachable = findReachableNodes(['event1'], nodes, edges);
    expect(reachable.has('event1')).toBe(true);
    expect(reachable.has('func1')).toBe(true);
    expect(reachable.has('orphan')).toBe(false);
  });
});

describe('traceExecPath', () => {
  it('traces linear exec chain', () => {
    const nodes: AnyFlowNode[] = [
      bpNode('a', 'event', [{ id: 'out', name: 'then', direction: 'output', category: 'exec' }]),
      bpNode('b', 'call_function', [
        { id: 'in', name: 'execute', direction: 'input', category: 'exec' },
        { id: 'out', name: 'then', direction: 'output', category: 'exec' },
      ]),
      bpNode('c', 'call_function', [{ id: 'in', name: 'execute', direction: 'input', category: 'exec' }]),
    ];
    const edges: BlueprintFlowEdge[] = [
      edge('a', 'out', 'b', 'in'),
      edge('b', 'out', 'c', 'in'),
    ];
    expect(traceExecPath('a', nodes, edges)).toEqual(['a', 'b', 'c']);
  });
});
