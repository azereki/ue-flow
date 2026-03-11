import { describe, it, expect } from 'vitest';
import { diagnoseNode } from '../node-diagnostics';
import type { FlowNodeData } from '../../types/flow-types';
import type { BlueprintFlowEdge } from '../../types/flow-types';
import type { UEPin } from '../../types/ue-graph';

function makePin(overrides: Partial<UEPin> = {}): UEPin {
  return {
    id: 'pin1',
    name: 'test',
    friendlyName: 'test',
    direction: 'input',
    category: 'exec',
    subCategory: '',
    subCategoryObject: '',
    containerType: '',
    defaultValue: '',
    isReference: false,
    isConst: false,
    isWeak: false,
    hidden: false,
    advancedView: false,
    ...overrides,
  };
}

function makeNodeData(overrides: Partial<FlowNodeData> = {}): FlowNodeData {
  return {
    ueType: 'call_function',
    nodeClass: 'K2Node_CallFunction',
    nodeGuid: 'AAAA0000BBBB1111CCCC2222DDDD3333',
    title: 'Test Node',
    properties: {},
    pins: [],
    ...overrides,
  };
}

function makeEdge(source: string, target: string, targetHandle?: string): BlueprintFlowEdge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    sourceHandle: 'out',
    targetHandle: targetHandle ?? 'in',
    type: 'blueprintEdge',
    data: { category: 'exec' },
  };
}

describe('diagnoseNode', () => {
  describe('missing reference detection', () => {
    it('flags K2Node_CallFunction without FunctionReference as error', () => {
      const data = makeNodeData({
        nodeClass: 'K2Node_CallFunction',
        properties: {},
      });
      const diags = diagnoseNode(data, 'n1', []);
      expect(diags).toHaveLength(1);
      expect(diags[0].severity).toBe('error');
      expect(diags[0].message).toContain('FunctionReference');
    });

    it('flags K2Node_CallFunction with empty FunctionReference', () => {
      const data = makeNodeData({
        nodeClass: 'K2Node_CallFunction',
        properties: { FunctionReference: '()' },
      });
      const diags = diagnoseNode(data, 'n1', []);
      expect(diags.some(d => d.severity === 'error' && d.message.includes('FunctionReference'))).toBe(true);
    });

    it('does not flag K2Node_CallFunction with valid FunctionReference', () => {
      const data = makeNodeData({
        nodeClass: 'K2Node_CallFunction',
        properties: { FunctionReference: '(MemberParent="/Script/Engine.Actor",MemberName="K2_DestroyActor")' },
      });
      const diags = diagnoseNode(data, 'n1', []);
      expect(diags.filter(d => d.message.includes('FunctionReference'))).toHaveLength(0);
    });

    it('flags K2Node_Event without EventReference as error', () => {
      const data = makeNodeData({
        nodeClass: 'K2Node_Event',
        ueType: 'event',
        properties: {},
      });
      const diags = diagnoseNode(data, 'n1', []);
      expect(diags.some(d => d.severity === 'error' && d.message.includes('EventReference'))).toBe(true);
    });

    it('flags K2Node_VariableGet without VariableReference as error', () => {
      const data = makeNodeData({
        nodeClass: 'K2Node_VariableGet',
        ueType: 'variable_get',
        properties: {},
      });
      const diags = diagnoseNode(data, 'n1', []);
      expect(diags.some(d => d.severity === 'error' && d.message.includes('VariableReference'))).toBe(true);
    });

    it('flags K2Node_VariableSet without VariableReference as error', () => {
      const data = makeNodeData({
        nodeClass: 'K2Node_VariableSet',
        ueType: 'variable_set',
        properties: {},
      });
      const diags = diagnoseNode(data, 'n1', []);
      expect(diags.some(d => d.severity === 'error' && d.message.includes('VariableReference'))).toBe(true);
    });
  });

  describe('unreachable node detection', () => {
    it('warns when impure node has exec input but no incoming exec connection', () => {
      const data = makeNodeData({
        ueType: 'call_function',
        pins: [
          makePin({ id: 'execIn', direction: 'input', category: 'exec' }),
          makePin({ id: 'dataOut', direction: 'output', category: 'real' }),
        ],
      });
      // Node has an outgoing data edge (so it's wired) but no incoming exec
      const edges: BlueprintFlowEdge[] = [
        makeEdge('n1', 'n2', 'somePin'),
      ];
      const diags = diagnoseNode(data, 'n1', edges);
      expect(diags.some(d => d.severity === 'warning' && d.message.includes('unreachable'))).toBe(true);
    });

    it('does not flag event nodes as unreachable', () => {
      const data = makeNodeData({
        ueType: 'event',
        nodeClass: 'K2Node_Event',
        properties: { EventReference: '(MemberName="ReceiveBeginPlay")' },
        pins: [
          makePin({ id: 'execIn', direction: 'input', category: 'exec' }),
          makePin({ id: 'execOut', direction: 'output', category: 'exec' }),
        ],
      });
      const edges: BlueprintFlowEdge[] = [makeEdge('n1', 'n2')];
      const diags = diagnoseNode(data, 'n1', edges);
      expect(diags.filter(d => d.message.includes('unreachable'))).toHaveLength(0);
    });

    it('does not flag function_entry nodes as unreachable', () => {
      const data = makeNodeData({
        ueType: 'function_entry',
        nodeClass: 'K2Node_FunctionEntry',
        pins: [
          makePin({ id: 'execIn', direction: 'input', category: 'exec' }),
        ],
      });
      const edges: BlueprintFlowEdge[] = [makeEdge('n1', 'n2')];
      const diags = diagnoseNode(data, 'n1', edges);
      expect(diags.filter(d => d.message.includes('unreachable'))).toHaveLength(0);
    });

    it('does not flag nodes with incoming exec connection', () => {
      const data = makeNodeData({
        ueType: 'call_function',
        pins: [
          makePin({ id: 'execIn', direction: 'input', category: 'exec' }),
        ],
      });
      // Incoming exec connection exists
      const edges: BlueprintFlowEdge[] = [
        { id: 'e1', source: 'n0', target: 'n1', sourceHandle: 'execOut', targetHandle: 'execIn', type: 'blueprintEdge', data: { category: 'exec' } },
      ];
      const diags = diagnoseNode(data, 'n1', edges);
      expect(diags.filter(d => d.message.includes('unreachable'))).toHaveLength(0);
    });

    it('does not flag isolated nodes (no connections at all)', () => {
      const data = makeNodeData({
        ueType: 'call_function',
        pins: [
          makePin({ id: 'execIn', direction: 'input', category: 'exec' }),
        ],
      });
      // No edges at all — freshly placed node
      const diags = diagnoseNode(data, 'n1', []);
      expect(diags.filter(d => d.message.includes('unreachable'))).toHaveLength(0);
    });
  });

  describe('pure nodes', () => {
    it('does not flag pure nodes (no exec pins) as unreachable', () => {
      const data = makeNodeData({
        ueType: 'call_function',
        pins: [
          makePin({ id: 'in1', direction: 'input', category: 'real' }),
          makePin({ id: 'out1', direction: 'output', category: 'real' }),
        ],
      });
      const edges: BlueprintFlowEdge[] = [makeEdge('n1', 'n2', 'dataIn')];
      const diags = diagnoseNode(data, 'n1', edges);
      expect(diags.filter(d => d.message.includes('unreachable'))).toHaveLength(0);
    });
  });

  describe('handles full-path node classes', () => {
    it('detects missing FunctionReference with full path class', () => {
      const data = makeNodeData({
        nodeClass: '/Script/BlueprintGraph.K2Node_CallFunction',
        properties: {},
      });
      const diags = diagnoseNode(data, 'n1', []);
      expect(diags.some(d => d.severity === 'error' && d.message.includes('FunctionReference'))).toBe(true);
    });
  });
});
