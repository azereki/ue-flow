import { describe, it, expect } from 'vitest';
import { parseT3DToGraphJSON } from '../t3d-to-json';
import { graphJsonToFlow } from '../json-to-flow';
import { flowToT3D } from '../flow-to-t3d';

// Minimal T3D for a single BeginPlay event node
const SIMPLE_EVENT_T3D = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA0000BBBB1111CCCC2222DDDD3333
   CustomProperties Pin (PinId=1111000011110000111100001111AAAA,PinName="OutputDelegate",Direction="EGPD_Output",PinType.PinCategory="delegate",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,bHidden=True,bAdvancedView=False)
   CustomProperties Pin (PinId=2222000022220000222200002222BBBB,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,bHidden=False,bAdvancedView=False)
End Object`;

// Two connected nodes
const CONNECTED_NODES_T3D = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA0000BBBB1111CCCC2222DDDD3333
   CustomProperties Pin (PinId=1111AAAA1111AAAA1111AAAA1111AAAA,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_CallFunction_0 2222BBBB2222BBBB2222BBBB2222BBBB,),bHidden=False,bAdvancedView=False)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")
   NodePosX=300
   NodePosY=0
   NodeGuid=BBBB0000AAAA1111CCCC2222DDDD3333
   CustomProperties Pin (PinId=2222BBBB2222BBBB2222BBBB2222BBBB,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_Event_0 1111AAAA1111AAAA1111AAAA1111AAAA,),bHidden=False,bAdvancedView=False)
   CustomProperties Pin (PinId=3333CCCC3333CCCC3333CCCC3333CCCC,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,bHidden=False,bAdvancedView=False)
   CustomProperties Pin (PinId=4444DDDD4444DDDD4444DDDD4444DDDD,PinName="InString",PinFriendlyName="In String",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="Hello",bHidden=False,bAdvancedView=False)
End Object`;

const COMMENT_T3D = `Begin Object Class=/Script/UnrealEd.EdGraphNode_Comment Name="EdGraphNode_Comment_0"
   NodePosX=100
   NodePosY=50
   NodeWidth=400
   NodeHeight=200
   NodeComment="Main Logic"
   NodeGuid=CCCC0000DDDD1111EEEE2222FFFF3333
End Object`;

describe('T3D round-trip', () => {
  it('preserves key properties for a simple event node', () => {
    const graph = parseT3DToGraphJSON(SIMPLE_EVENT_T3D);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].title).toBe('Event ReceiveBeginPlay');

    const { nodes, edges } = graphJsonToFlow(graph);
    const t3dOut = flowToT3D(nodes, edges);

    // Verify essential properties are present in output
    expect(t3dOut).toContain('EventReference=');
    expect(t3dOut).toContain('ReceiveBeginPlay');
    expect(t3dOut).toContain('bOverrideFunction=True');
    expect(t3dOut).toContain('K2Node_Event');
  });

  it('preserves edges through round-trip', () => {
    const graph = parseT3DToGraphJSON(CONNECTED_NODES_T3D);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);

    const { nodes, edges } = graphJsonToFlow(graph);
    expect(edges).toHaveLength(1);

    const t3dOut = flowToT3D(nodes, edges);

    // Both nodes present
    expect(t3dOut).toContain('K2Node_Event');
    expect(t3dOut).toContain('K2Node_CallFunction');
    // LinkedTo present (connections preserved)
    expect(t3dOut).toContain('LinkedTo=');
  });

  it('preserves comment node dimensions', () => {
    const graph = parseT3DToGraphJSON(COMMENT_T3D);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].type).toBe('comment');
    expect(graph.nodes[0].title).toBe('Main Logic');

    const { nodes, edges } = graphJsonToFlow(graph);
    const t3dOut = flowToT3D(nodes, edges);

    expect(t3dOut).toContain('EdGraphNode_Comment');
    expect(t3dOut).toContain('NodeComment="Main Logic"');
    expect(t3dOut).toContain('NodeWidth=400');
    expect(t3dOut).toContain('NodeHeight=200');
  });

  it('preserves pin default values through round-trip', () => {
    const graph = parseT3DToGraphJSON(CONNECTED_NODES_T3D);
    const printNode = graph.nodes.find(n => n.title === 'PrintString');
    expect(printNode).toBeDefined();

    const inStringPin = printNode!.pins.find(p => p.name === 'InString');
    expect(inStringPin).toBeDefined();
    expect(inStringPin!.defaultValue).toBe('Hello');

    const { nodes, edges } = graphJsonToFlow(graph);
    const t3dOut = flowToT3D(nodes, edges);

    expect(t3dOut).toContain('DefaultValue="Hello"');
  });

  it('injects hidden pins for CallFunction nodes on export', () => {
    const graph = parseT3DToGraphJSON(CONNECTED_NODES_T3D);
    const { nodes, edges } = graphJsonToFlow(graph);
    const t3dOut = flowToT3D(nodes, edges);

    // flowToT3D injects hidden self and WorldContextObject pins
    expect(t3dOut).toContain('PinName="self"');
    expect(t3dOut).toContain('PinName="WorldContextObject"');
  });
});
