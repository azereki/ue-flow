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

// ===================================================================
// Property synthesis — nodes with short class names and missing properties
// ===================================================================

describe('flowToT3D property synthesis', () => {
  const DEMO_STYLE_GRAPH: UEGraphJSON = {
    metadata: { title: 'EventGraph', assetPath: '' },
    nodes: [
      {
        id: 'BeginPlay',
        type: 'event',
        nodeClass: 'K2Node_Event',
        nodeGuid: 'E000000000000001',
        position: { x: 0, y: 0 },
        title: 'Event BeginPlay',
        properties: {},
        pins: [
          { id: 'bp-then', name: 'then', friendlyName: '', direction: 'output', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        ],
      },
      {
        id: 'EventTick',
        type: 'event',
        nodeClass: 'K2Node_Event',
        nodeGuid: 'E000000000000002',
        position: { x: 0, y: 200 },
        title: 'Event Tick',
        properties: {},
        pins: [
          { id: 'tick-then', name: 'then', friendlyName: '', direction: 'output', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        ],
      },
      {
        id: 'PrintStr',
        type: 'call_function',
        nodeClass: 'K2Node_CallFunction',
        nodeGuid: 'F000000000000001',
        position: { x: 400, y: 0 },
        title: 'Print String',
        properties: {},
        pins: [
          { id: 'ps-exec', name: 'execute', friendlyName: '', direction: 'input', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        ],
      },
    ],
    edges: [
      { id: 'e0', source: 'BeginPlay', sourcePin: 'then', target: 'PrintStr', targetPin: 'execute', category: 'exec' },
    ],
  };

  it('qualifies short nodeClass to full /Script/ path', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('Class=/Script/BlueprintGraph.K2Node_Event');
    expect(t3d).toContain('Class=/Script/BlueprintGraph.K2Node_CallFunction');
    expect(t3d).not.toMatch(/Class=K2Node_Event[^.]/);
  });

  it('synthesizes EventReference for BeginPlay', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")');
    expect(t3d).toContain('bOverrideFunction=True');
  });

  it('synthesizes EventReference for Tick', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('MemberName="ReceiveTick"');
  });

  it('synthesizes FunctionReference for Print String', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")');
  });

  it('does not overwrite existing properties', () => {
    const { nodes, edges } = graphJsonToFlow(SAMPLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    // Original EventReference should be preserved as-is
    expect(t3d).toContain('MemberName="ReceiveBeginPlay"');
    // Should not double-emit
    expect(t3d.match(/EventReference=/g)?.length).toBe(1);
  });

  it('converts non-hex pin IDs to valid hex GUIDs', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    // Should not contain any non-hex pin IDs in PinId= fields
    const pinIdMatches = t3d.match(/PinId=([A-Fa-f0-9]+)/g) ?? [];
    expect(pinIdMatches.length).toBeGreaterThan(0);
    for (const m of pinIdMatches) {
      const id = m.replace('PinId=', '');
      expect(id).toMatch(/^[0-9A-F]+$/);
      expect(id.length).toBe(32);
    }
  });

  it('LinkedTo references use matching hex pin IDs', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    // Extract all PinId values and LinkedTo references
    const pinIds = new Set((t3d.match(/PinId=([A-F0-9]+)/g) ?? []).map(m => m.replace('PinId=', '')));
    const linkedRefs = t3d.match(/LinkedTo=\(([^)]+)\)/g) ?? [];
    for (const ref of linkedRefs) {
      // Extract pin IDs from LinkedTo=(NodeName PINID,)
      const innerPinIds = (ref.match(/\s([A-F0-9]+)/g) ?? []).map(m => m.trim());
      for (const id of innerPinIds) {
        expect(pinIds.has(id)).toBe(true);
      }
    }
  });

  it('only emits AutogeneratedDefaultValue when explicitly set on pin', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    // Pins with DefaultValue but no autogeneratedDefaultValue should NOT get AGDV
    const agdvMatches = t3d.match(/AutogeneratedDefaultValue="[^"]+"/g) ?? [];
    // DEMO_STYLE_GRAPH pins have no explicit autogeneratedDefaultValue field, so none should appear
    expect(agdvMatches).toHaveLength(0);
  });

  it('injects hidden self and WorldContextObject pins for CallFunction nodes', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    // Print String is a K2Node_CallFunction — should get hidden pins
    expect(t3d).toContain('PinName="self"');
    expect(t3d).toContain('PinName="WorldContextObject"');
    // They should be marked hidden
    const selfLine = t3d.split('\n').find((l) => l.includes('PinName="self"'));
    expect(selfLine).toContain('bHidden=True');
    // Self pin should have NSLOCTEXT Target friendly name
    expect(selfLine).toContain('PinFriendlyName=NSLOCTEXT("K2Node", "Target", "Target")');
  });

  it('emits DefaultObject on self pin when FunctionReference has library class', () => {
    const graphWithRef: UEGraphJSON = {
      metadata: { title: 'EventGraph', assetPath: '' },
      nodes: [{
        id: 'PrintStr',
        type: 'call_function',
        nodeClass: 'K2Node_CallFunction',
        nodeGuid: 'F000000000000001',
        position: { x: 0, y: 0 },
        title: 'Print String',
        properties: {
          FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
        },
        pins: [
          { id: 'ps-exec', name: 'execute', friendlyName: '', direction: 'input', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        ],
      }],
      edges: [],
    };
    const { nodes, edges } = graphJsonToFlow(graphWithRef);
    const t3d = flowToT3D(nodes, edges);
    const selfLine = t3d.split('\n').find((l) => l.includes('PinName="self"'));
    expect(selfLine).toContain('DefaultObject="/Script/Engine.Default__KismetSystemLibrary"');
    expect(selfLine).toContain('PinSubCategoryObject=/Script/CoreUObject.Class');
  });

  it('validates nodeGuids at export time (32-char hex)', () => {
    const { nodes, edges } = graphJsonToFlow(DEMO_STYLE_GRAPH);
    const t3d = flowToT3D(nodes, edges);
    const guidMatches = t3d.match(/NodeGuid=([A-F0-9]+)/g) ?? [];
    expect(guidMatches.length).toBeGreaterThan(0);
    for (const m of guidMatches) {
      const guid = m.replace('NodeGuid=', '');
      expect(guid).toMatch(/^[0-9A-F]{32}$/);
    }
  });

  it('synthesizes VariableReference for variable get nodes', () => {
    const varGraph: UEGraphJSON = {
      metadata: { title: 'EventGraph', assetPath: '' },
      nodes: [{
        id: 'GetHealth',
        type: 'variable_get',
        nodeClass: 'K2Node_VariableGet',
        nodeGuid: 'V000000000000001',
        position: { x: 0, y: 0 },
        title: 'Health',
        properties: {},
        pins: [
          { id: 'gh-out', name: 'Health', friendlyName: '', direction: 'output', category: 'real', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        ],
      }],
      edges: [],
    };
    const { nodes, edges } = graphJsonToFlow(varGraph);
    const t3d = flowToT3D(nodes, edges);
    expect(t3d).toContain('VariableReference=(MemberName="Health",bSelfContext=True)');
  });
});
