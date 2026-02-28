import { describe, it, expect } from 'vitest';
import { flowToT3D } from '../flow-to-t3d';
import { graphJsonToFlow } from '../json-to-flow';
import type { UEGraphJSON } from '../../types/ue-graph';

const SAMPLE_GRAPH: UEGraphJSON = {
  metadata: { title: 'EventGraph', assetPath: '/Game/BP_Test' },
  nodes: [
    {
      id: 'K2Node_Event_0',
      type: 'event',
      nodeClass: '/Script/BlueprintGraph.K2Node_Event',
      nodeGuid: 'AAAA0000BBBB1111CCCC2222DDDD3333',
      position: { x: 0, y: 0 },
      title: 'Event BeginPlay',
      properties: {
        EventReference: '(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")',
      },
      pins: [
        { id: '11112222333344445555666677778888', name: 'then', friendlyName: '', direction: 'output', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: 'CCCC1111222233334444555566667777', name: 'OutputDelegate', friendlyName: '', direction: 'output', category: 'delegate', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: true, advancedView: false },
      ],
    },
    {
      id: 'K2Node_CallFunction_0',
      type: 'call_function',
      nodeClass: '/Script/BlueprintGraph.K2Node_CallFunction',
      nodeGuid: 'BBBB1111222233334444555566667777',
      position: { x: 400, y: 0 },
      title: 'Print String',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
      },
      pins: [
        { id: 'AABB112233445566AABB112233445566', name: 'execute', friendlyName: '', direction: 'input', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: 'DDDD1111222233334444555566667777', name: 'then', friendlyName: '', direction: 'output', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: 'EEEE1111222233334444555566667777', name: 'InString', friendlyName: 'In String', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: 'Hello from Blueprint!', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    },
  ],
  edges: [
    { id: 'edge-0', source: 'K2Node_Event_0', sourcePin: 'then', target: 'K2Node_CallFunction_0', targetPin: 'execute', category: 'exec' },
  ],
};

describe('flowToT3D', () => {
  it('produces valid Begin Object / End Object blocks', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('Begin Object');
    expect(t3d).toContain('End Object');
    expect(t3d.match(/Begin Object/g)?.length).toBe(2);
    expect(t3d.match(/End Object/g)?.length).toBe(2);
  });

  it('preserves node class and name', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('Class=/Script/BlueprintGraph.K2Node_Event');
    expect(t3d).toContain('Name="K2Node_Event_0"');
    expect(t3d).toContain('Class=/Script/BlueprintGraph.K2Node_CallFunction');
    expect(t3d).toContain('Name="K2Node_CallFunction_0"');
  });

  it('preserves node positions', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('NodePosX=0');
    expect(t3d).toContain('NodePosX=400');
  });

  it('preserves node GUIDs', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('NodeGuid=AAAA0000BBBB1111CCCC2222DDDD3333');
    expect(t3d).toContain('NodeGuid=BBBB1111222233334444555566667777');
  });

  it('serializes pins with correct categories', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('PinType.PinCategory="exec"');
    expect(t3d).toContain('PinType.PinCategory="string"');
  });

  it('preserves pin default values', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('DefaultValue="Hello from Blueprint!"');
  });

  it('generates bidirectional LinkedTo references from edges', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    // Event "then" pin should link to CallFunction "execute" pin
    expect(t3d).toContain('LinkedTo=(K2Node_CallFunction_0 AABB112233445566AABB112233445566,)');
    // CallFunction "execute" pin should link back to Event "then" pin
    expect(t3d).toContain('LinkedTo=(K2Node_Event_0 11112222333344445555666677778888,)');
  });

  it('preserves properties like EventReference and FunctionReference', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('EventReference=');
    expect(t3d).toContain('ReceiveBeginPlay');
    expect(t3d).toContain('FunctionReference=');
    expect(t3d).toContain('PrintString');
  });

  it('handles hidden pins', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('bHidden=True');
  });

  it('reflects position changes from React Flow', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    // Simulate user dragging a node
    nodes[0].position = { x: 150, y: 300 };
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('NodePosX=150');
    expect(t3d).toContain('NodePosY=300');
  });
});
