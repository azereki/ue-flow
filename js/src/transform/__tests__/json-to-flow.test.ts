import { describe, it, expect } from 'vitest';
import { graphJsonToFlow } from '../json-to-flow';
import type { UEGraphJSON } from '../../types/ue-graph';

const SAMPLE_GRAPH: UEGraphJSON = {
  metadata: { title: 'EventGraph', assetPath: '/Game/BP_Test' },
  nodes: [
    {
      id: 'K2Node_Event_0',
      type: 'event',
      nodeClass: 'K2Node_Event',
      nodeGuid: 'AAAA0000BBBB1111CCCC2222DDDD3333',
      position: { x: 0, y: 0 },
      title: 'Event BeginPlay',
      properties: {},
      pins: [
        { id: 'pin-1', name: 'then', friendlyName: '', direction: 'output', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: 'pin-2', name: 'OutputDelegate', friendlyName: '', direction: 'output', category: 'delegate', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: true, advancedView: false },
      ],
    },
    {
      id: 'K2Node_CallFunction_0',
      type: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'EEEE0000FFFF1111AAAA2222BBBB3333',
      position: { x: 400, y: 0 },
      title: 'Print String',
      properties: {},
      pins: [
        { id: 'pin-3', name: 'execute', friendlyName: '', direction: 'input', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: 'pin-4', name: 'InString', friendlyName: 'In String', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: 'Hello', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    },
  ],
  edges: [
    { id: 'edge-0', source: 'K2Node_Event_0', sourcePin: 'then', target: 'K2Node_CallFunction_0', targetPin: 'execute', category: 'exec' },
  ],
};

describe('graphJsonToFlow', () => {
  it('converts nodes with correct positions', () => {
    const { nodes } = graphJsonToFlow(SAMPLE_GRAPH);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[1].position).toEqual({ x: 400, y: 0 });
  });

  it('assigns correct node types', () => {
    const { nodes } = graphJsonToFlow(SAMPLE_GRAPH);
    expect(nodes[0].type).toBe('blueprintNode');
    expect((nodes[0].data as any).ueType).toBe('event');
  });

  it('passes pin data to node data', () => {
    const { nodes } = graphJsonToFlow(SAMPLE_GRAPH);
    const visiblePins = (nodes[0].data as any).pins.filter((p: any) => !p.hidden);
    expect(visiblePins).toHaveLength(1);
    expect(visiblePins[0].name).toBe('then');
  });

  it('converts edges with handle IDs matching pin IDs', () => {
    const { edges } = graphJsonToFlow(SAMPLE_GRAPH);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('K2Node_Event_0');
    expect(edges[0].sourceHandle).toBe('pin-1');
    expect(edges[0].target).toBe('K2Node_CallFunction_0');
    expect(edges[0].targetHandle).toBe('pin-3');
  });

  it('assigns edge type and category for coloring', () => {
    const { edges } = graphJsonToFlow(SAMPLE_GRAPH);
    expect(edges[0].type).toBe('blueprintEdge');
    expect((edges[0].data as any).category).toBe('exec');
  });

  it('maps comment nodes to commentNode type', () => {
    const commentGraph: UEGraphJSON = {
      metadata: { title: 'Test', assetPath: '' },
      nodes: [{
        id: 'Comment_0',
        type: 'comment',
        nodeClass: 'EdGraphNode_Comment',
        nodeGuid: 'CCCC0000DDDD1111',
        position: { x: 0, y: 0 },
        title: 'My Comment',
        properties: {},
        pins: [],
      }],
      edges: [],
    };
    const { nodes } = graphJsonToFlow(commentGraph);
    expect(nodes[0].type).toBe('commentNode');
  });
});
