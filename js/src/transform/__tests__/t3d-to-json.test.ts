import { describe, it, expect } from 'vitest';
import { parseT3DToGraphJSON, isT3DText, tokenizePinContent } from '../t3d-to-json';
import { graphJsonToFlow } from '../json-to-flow';
import { flowToT3D } from '../flow-to-t3d';
import { EVENT_NODE_T3D, CALL_FUNCTION_NODE_T3D, MULTI_NODE_T3D } from './fixtures/t3d-samples';

// ===================================================================
// tokenizePinContent
// ===================================================================

describe('tokenizePinContent', () => {
  it('parses quoted values with commas', () => {
    const tokens = tokenizePinContent('PinName="My, Pin",PinId=AABB');
    expect(tokens).toEqual([
      ['PinName', 'My, Pin'],
      ['PinId', 'AABB'],
    ]);
  });

  it('parses parenthesized LinkedTo', () => {
    const tokens = tokenizePinContent(
      'PinId=AA,LinkedTo=(Node1 Pin1,Node2 Pin2,),bHidden=False'
    );
    expect(tokens).toEqual([
      ['PinId', 'AA'],
      ['LinkedTo', '(Node1 Pin1,Node2 Pin2,)'],
      ['bHidden', 'False'],
    ]);
  });

  it('handles escaped quotes in values', () => {
    const tokens = tokenizePinContent('PinName="Say \\"Hello\\"",PinId=BB');
    expect(tokens).toEqual([
      ['PinName', 'Say \\"Hello\\"'],
      ['PinId', 'BB'],
    ]);
  });

  it('handles unquoted boolean values', () => {
    const tokens = tokenizePinContent('bHidden=True,bAdvancedView=False');
    expect(tokens).toEqual([
      ['bHidden', 'True'],
      ['bAdvancedView', 'False'],
    ]);
  });

  it('handles mixed mode values', () => {
    const tokens = tokenizePinContent(
      'PinId=AA,PinName="test",PinType.PinSubCategoryMemberReference=(),DefaultValue="hello"'
    );
    expect(tokens.length).toBe(4);
    expect(tokens[0]).toEqual(['PinId', 'AA']);
    expect(tokens[1]).toEqual(['PinName', 'test']);
    expect(tokens[2]).toEqual(['PinType.PinSubCategoryMemberReference', '()']);
    expect(tokens[3]).toEqual(['DefaultValue', 'hello']);
  });

  it('handles empty content', () => {
    expect(tokenizePinContent('')).toEqual([]);
  });

  it('handles nested parens with quoted strings inside', () => {
    const tokens = tokenizePinContent(
      'PinType.PinSubCategoryMemberReference=(MemberParent="/Script/Engine.Actor",MemberName="OnDestroyed"),bHidden=False'
    );
    expect(tokens.length).toBe(2);
    expect(tokens[0][0]).toBe('PinType.PinSubCategoryMemberReference');
    expect(tokens[0][1]).toContain('MemberName="OnDestroyed"');
    expect(tokens[1]).toEqual(['bHidden', 'False']);
  });
});

// ===================================================================
// parseT3DToGraphJSON / node parsing
// ===================================================================

describe('parseT3DToGraphJSON - node parsing', () => {
  it('parses event node class and name', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    expect(graph.nodes.length).toBe(1);
    const node = graph.nodes[0];
    expect(node.nodeClass).toBe('/Script/BlueprintGraph.K2Node_Event');
    expect(node.id).toBe('K2Node_Event_0');
  });

  it('parses call function node class and name', () => {
    const graph = parseT3DToGraphJSON(CALL_FUNCTION_NODE_T3D);
    expect(graph.nodes.length).toBe(1);
    const node = graph.nodes[0];
    expect(node.nodeClass).toBe('/Script/BlueprintGraph.K2Node_CallFunction');
    expect(node.id).toBe('K2Node_CallFunction_0');
  });

  it('parses node position', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    const node = graph.nodes[0];
    expect(node.position).toEqual({ x: 100, y: 200 });
  });

  it('parses node guid', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    expect(graph.nodes[0].nodeGuid).toBe('AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB');
  });

  it('parses node properties', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    const props = graph.nodes[0].properties as Record<string, string>;
    expect(props['EventReference']).toContain('ReceiveBeginPlay');
    expect(props['bOverrideFunction']).toBe('True');
  });

  it('parses call function properties', () => {
    const graph = parseT3DToGraphJSON(CALL_FUNCTION_NODE_T3D);
    const props = graph.nodes[0].properties as Record<string, string>;
    expect(props['FunctionReference']).toContain('PrintString');
    expect(props['bIsPureFunc']).toBe('False');
  });

  it('parses multi-node graph', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    expect(graph.nodes.length).toBe(3);
    const names = graph.nodes.map(n => n.id).sort();
    expect(names).toEqual([
      'K2Node_CallFunction_0',
      'K2Node_Event_0',
      'K2Node_IfThenElse_0',
    ]);
  });

  it('sets custom title when provided', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D, 'MyGraph');
    expect(graph.metadata.title).toBe('MyGraph');
  });

  it('defaults title to EventGraph', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    expect(graph.metadata.title).toBe('EventGraph');
  });

  it('returns empty graph for empty input', () => {
    const graph = parseT3DToGraphJSON('');
    expect(graph.nodes.length).toBe(0);
    expect(graph.edges.length).toBe(0);
  });
});

// ===================================================================
// parseT3DToGraphJSON / pin parsing
// ===================================================================

describe('parseT3DToGraphJSON - pin parsing', () => {
  it('parses exec output pin', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    const thenPin = graph.nodes[0].pins.find(p => p.name === 'then');
    expect(thenPin).toBeDefined();
    expect(thenPin!.category).toBe('exec');
    expect(thenPin!.direction).toBe('output');
  });

  it('parses delegate pin category', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    const delegatePin = graph.nodes[0].pins.find(p => p.name === 'OutputDelegate');
    expect(delegatePin).toBeDefined();
    expect(delegatePin!.category).toBe('delegate');
    expect(delegatePin!.direction).toBe('output');
  });

  it('parses data pin with default value', () => {
    const graph = parseT3DToGraphJSON(CALL_FUNCTION_NODE_T3D);
    const inStrPin = graph.nodes[0].pins.find(p => p.name === 'InString');
    expect(inStrPin).toBeDefined();
    expect(inStrPin!.category).toBe('string');
    expect(inStrPin!.defaultValue).toBe('Hello from Blueprint!');
  });

  it('parses input pin direction (defaults to input)', () => {
    const graph = parseT3DToGraphJSON(CALL_FUNCTION_NODE_T3D);
    const execPin = graph.nodes[0].pins.find(p => p.name === 'execute');
    expect(execPin).toBeDefined();
    expect(execPin!.direction).toBe('input');
  });

  it('preserves pin IDs', () => {
    const graph = parseT3DToGraphJSON(CALL_FUNCTION_NODE_T3D);
    const execPin = graph.nodes[0].pins.find(p => p.name === 'execute');
    expect(execPin!.id).toBe('AABB112233445566AABB112233445566');
  });

  it('parses hidden pin', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA2222333344445555666677778888
   CustomProperties Pin (PinId=FFFF1111222233334444555566667777,PinName="self",PinType.PinCategory="object",PinType.PinSubCategory="",PinType.PinSubCategoryObject=/Script/Engine.KismetSystemLibrary,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=True,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    const selfPin = graph.nodes[0].pins.find(p => p.name === 'self');
    expect(selfPin!.hidden).toBe(true);
  });

  it('parses advancedView pin', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA3333444455556666777788889999
   CustomProperties Pin (PinId=1111AAAA2222BBBB3333CCCC4444DDDD,PinName="bPrintToLog",PinType.PinCategory="bool",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="true",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=True,bOrphanedPin=False,)
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    const pin = graph.nodes[0].pins.find(p => p.name === 'bPrintToLog');
    expect(pin!.advancedView).toBe(true);
    expect(pin!.category).toBe('bool');
    expect(pin!.defaultValue).toBe('true');
  });

  it('parses subCategoryObject', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA4444555566667777888899990000
   CustomProperties Pin (PinId=2222AAAA3333BBBB4444CCCC5555DDDD,PinName="WorldContextObject",PinType.PinCategory="object",PinType.PinSubCategory="",PinType.PinSubCategoryObject=/Script/CoreUObject.Object,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=True,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=True,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    const pin = graph.nodes[0].pins.find(p => p.name === 'WorldContextObject');
    expect(pin!.category).toBe('object');
    expect(pin!.subCategoryObject).toBe('/Script/CoreUObject.Object');
    expect(pin!.isConst).toBe(true);
  });

  it('parses friendly name', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const branch = graph.nodes.find(n => n.id === 'K2Node_IfThenElse_0')!;
    const thenPin = branch.pins.find(p => p.name === 'then');
    expect(thenPin!.friendlyName).toBe('True');
  });

  it('parses container type', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA6666777788889999000011112222
   CustomProperties Pin (PinId=4444AAAA5555BBBB6666CCCC7777DDDD,PinName="OutActors",Direction="EGPD_Output",PinType.PinCategory="object",PinType.PinSubCategory="",PinType.PinSubCategoryObject=/Script/Engine.Actor,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=Array,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    const pin = graph.nodes[0].pins.find(p => p.name === 'OutActors');
    expect(pin!.containerType).toBe('Array');
    expect(pin!.subCategoryObject).toBe('/Script/Engine.Actor');
    expect(pin!.direction).toBe('output');
  });

  it('parses reference, const, weak flags', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA7777888899990000111122223333
   CustomProperties Pin (PinId=5555AAAA6666BBBB7777CCCC8888DDDD,PinName="Target",PinType.PinCategory="object",PinType.PinSubCategory="",PinType.PinSubCategoryObject=/Script/Engine.Actor,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=True,PinType.bIsConst=True,PinType.bIsWeakPointer=True,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    const pin = graph.nodes[0].pins.find(p => p.name === 'Target');
    expect(pin!.isReference).toBe(true);
    expect(pin!.isConst).toBe(true);
    expect(pin!.isWeak).toBe(true);
  });

  it('parses autogenerated default value and subCategory', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA8888999900001111222233334444
   CustomProperties Pin (PinId=6666AAAA7777BBBB8888CCCC9999DDDD,PinName="Duration",PinType.PinCategory="real",PinType.PinSubCategory="double",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="2.0",AutogeneratedDefaultValue="0.0",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    const pin = graph.nodes[0].pins.find(p => p.name === 'Duration');
    expect(pin!.category).toBe('real');
    expect(pin!.subCategory).toBe('double');
    expect(pin!.defaultValue).toBe('2.0');
    expect(pin!.autogeneratedDefaultValue).toBe('0.0');
  });
});

// ===================================================================
// parseT3DToGraphJSON / edge extraction
// ===================================================================

describe('parseT3DToGraphJSON - edge extraction', () => {
  it('extracts edges from output pin linkedTo', () => {
    const graph = parseT3DToGraphJSON(
      EVENT_NODE_T3D + '\n\n' + CALL_FUNCTION_NODE_T3D
    );
    // Event "then" -> CallFunction "execute" (output pin on event)
    expect(graph.edges.length).toBe(1);
    const edge = graph.edges[0];
    expect(edge.source).toBe('K2Node_Event_0');
    expect(edge.sourcePin).toBe('then');
    expect(edge.target).toBe('K2Node_CallFunction_0');
    expect(edge.targetPin).toBe('execute');
    expect(edge.category).toBe('exec');
  });

  it('deduplicates edges (only traverses OUTPUT pins)', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    // Event->Branch, Branch->PrintString = 2 exec edges
    expect(graph.edges.length).toBe(2);
  });

  it('assigns correct category to edges', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    for (const edge of graph.edges) {
      expect(edge.category).toBe('exec');
    }
  });

  it('resolves target pin names via lookup', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const edgeToFunction = graph.edges.find(e => e.target === 'K2Node_CallFunction_0');
    expect(edgeToFunction).toBeDefined();
    expect(edgeToFunction!.targetPin).toBe('execute');
  });

  it('handles multi-edge Branch (True output)', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const branchEdge = graph.edges.find(
      e => e.source === 'K2Node_IfThenElse_0' && e.sourcePin === 'then'
    );
    expect(branchEdge).toBeDefined();
    expect(branchEdge!.target).toBe('K2Node_CallFunction_0');
  });
});

// ===================================================================
// Type inference
// ===================================================================

describe('type inference', () => {
  it('maps full path to correct type', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    expect(graph.nodes[0].type).toBe('event');
  });

  it('maps branch class to branch type', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const branch = graph.nodes.find(n => n.id === 'K2Node_IfThenElse_0');
    expect(branch!.type).toBe('branch');
  });

  it('maps call function to call_function type', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const fn = graph.nodes.find(n => n.id === 'K2Node_CallFunction_0');
    expect(fn!.type).toBe('call_function');
  });

  it('falls back to function for unknown classes', () => {
    const t3d = `\
Begin Object Class=/Script/MyPlugin.SomeCustomNode Name="CustomNode_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=1111222233334444AAAABBBBCCCCDDDD
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    expect(graph.nodes[0].type).toBe('function');
  });

  it('handles short class names', () => {
    const t3d = `\
Begin Object Class=K2Node_Knot Name="K2Node_Knot_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA1111BBBB2222CCCC3333DDDD4444
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    expect(graph.nodes[0].type).toBe('reroute');
  });
});

// ===================================================================
// Title inference
// ===================================================================

describe('title inference', () => {
  it('infers Event title from EventReference', () => {
    const graph = parseT3DToGraphJSON(EVENT_NODE_T3D);
    expect(graph.nodes[0].title).toBe('Event ReceiveBeginPlay');
  });

  it('infers function name from FunctionReference', () => {
    const graph = parseT3DToGraphJSON(CALL_FUNCTION_NODE_T3D);
    expect(graph.nodes[0].title).toBe('PrintString');
  });

  it('uses friendly title for Branch', () => {
    const graph = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const branch = graph.nodes.find(n => n.id === 'K2Node_IfThenElse_0');
    expect(branch!.title).toBe('Branch');
  });

  it('infers VariableGet title', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_VariableGet Name="K2Node_VariableGet_0"
   VariableReference=(MemberName="Health",MemberGuid=AAAA1111BBBB2222)
   NodePosX=0
   NodePosY=0
   NodeGuid=DDDD1111EEEE2222FFFF3333AAAA4444
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    expect(graph.nodes[0].title).toBe('Health');
  });

  it('infers VariableSet title with Set prefix', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_VariableSet Name="K2Node_VariableSet_0"
   VariableReference=(MemberName="Health",MemberGuid=AAAA1111BBBB2222)
   NodePosX=0
   NodePosY=0
   NodeGuid=EEEE1111FFFF2222AAAA3333BBBB4444
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    expect(graph.nodes[0].title).toBe('Set Health');
  });

  it('infers Comment title from NodeComment', () => {
    const t3d = `\
Begin Object Class=/Script/UnrealEd.EdGraphNode_Comment Name="EdGraphNode_Comment_0"
   NodeComment="My Comment Text"
   NodePosX=0
   NodePosY=0
   NodeGuid=FFFF1111AAAA2222BBBB3333CCCC4444
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    expect(graph.nodes[0].title).toBe('My Comment Text');
  });

  it('infers Cast title from TargetType', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_DynamicCast Name="K2Node_DynamicCast_0"
   TargetType=/Script/Engine.Character
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA1111BBBB2222CCCC3333DDDD4444
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    expect(graph.nodes[0].title).toBe('Cast To Character');
  });

  it('falls back to cleaned class name for unknown nodes', () => {
    const t3d = `\
Begin Object Class=/Script/BlueprintGraph.K2Node_SomethingNew Name="K2Node_SomethingNew_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=BBBB1111CCCC2222DDDD3333EEEE4444
End Object`;
    const graph = parseT3DToGraphJSON(t3d);
    expect(graph.nodes[0].title).toBe('SomethingNew');
  });
});

// ===================================================================
// isT3DText
// ===================================================================

describe('isT3DText', () => {
  it('returns true for valid T3D', () => {
    expect(isT3DText(EVENT_NODE_T3D)).toBe(true);
  });

  it('returns true for multi-node T3D', () => {
    expect(isT3DText(MULTI_NODE_T3D)).toBe(true);
  });

  it('returns false for JSON', () => {
    expect(isT3DText('{"nodes": [], "edges": []}')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isT3DText('')).toBe(false);
  });

  it('returns false for whitespace', () => {
    expect(isT3DText('   \n\n  ')).toBe(false);
  });

  it('returns false for random text', () => {
    expect(isT3DText('Hello World')).toBe(false);
  });
});

// ===================================================================
// Round-trip parity
// ===================================================================

describe('round-trip parity', () => {
  it('preserves node count through full round-trip', () => {
    const original = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const { nodes, edges } = graphJsonToFlow(original);
    const t3dText = flowToT3D(nodes, edges);
    const reparsed = parseT3DToGraphJSON(t3dText);

    expect(reparsed.nodes.length).toBe(original.nodes.length);
  });

  it('preserves node names through full round-trip', () => {
    const original = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const { nodes, edges } = graphJsonToFlow(original);
    const t3dText = flowToT3D(nodes, edges);
    const reparsed = parseT3DToGraphJSON(t3dText);

    const originalNames = new Set(original.nodes.map(n => n.id));
    const reparsedNames = new Set(reparsed.nodes.map(n => n.id));
    expect(reparsedNames).toEqual(originalNames);
  });

  it('preserves connection count through full round-trip', () => {
    const original = parseT3DToGraphJSON(MULTI_NODE_T3D);
    const { nodes, edges } = graphJsonToFlow(original);
    const t3dText = flowToT3D(nodes, edges);
    const reparsed = parseT3DToGraphJSON(t3dText);

    expect(reparsed.edges.length).toBe(original.edges.length);
  });

  it('preserves two-node graph through round-trip', () => {
    const twoNodeT3D = EVENT_NODE_T3D + '\n\n' + CALL_FUNCTION_NODE_T3D;
    const original = parseT3DToGraphJSON(twoNodeT3D);
    const { nodes, edges } = graphJsonToFlow(original);
    const t3dText = flowToT3D(nodes, edges);
    const reparsed = parseT3DToGraphJSON(t3dText);

    expect(reparsed.nodes.length).toBe(2);
    expect(reparsed.edges.length).toBe(1);
  });
});
