import type { UEGraphJSON } from '../types/ue-graph';

/**
 * Sample Blueprint graph for the landing page live demo.
 * BeginPlay → Branch → PrintString (true) / DestroyActor (false),
 * with a float variable feeding into the Branch condition via comparison.
 *
 * All data uses real UE properties for 100% paste-back accuracy.
 */
export const DEMO_GRAPH: UEGraphJSON = {
  metadata: {
    title: 'EventGraph',
    assetPath: '/Game/BP_DemoActor',
  },
  nodes: [
    {
      id: 'Event_BeginPlay',
      type: 'event',
      nodeClass: 'K2Node_Event',
      nodeGuid: 'A000B000C000D000A000B000C000D000',
      position: { x: 0, y: 0 },
      title: 'Event BeginPlay',
      properties: {
        EventReference: '(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")',
        bOverrideFunction: 'True',
      },
      pins: [
        { id: 'A100000000000000A100000000000001', name: 'then', direction: 'output', category: 'exec' },
        { id: 'A100000000000000A100000000000002', name: 'OutputDelegate', direction: 'output', category: 'delegate', hidden: true },
      ],
    },
    {
      id: 'GetHealth',
      type: 'variable_get',
      nodeClass: 'K2Node_VariableGet',
      nodeGuid: 'A100B100C100D100A100B100C100D100',
      position: { x: 40, y: 180 },
      title: 'Health',
      properties: {
        VariableReference: '(MemberName="Health",bSelfContext=True)',
      },
      pins: [
        { id: 'A200000000000000A200000000000001', name: 'Health', direction: 'output', category: 'real', subCategory: 'double' },
        { id: 'A200000000000000A200000000000002', name: 'self', direction: 'input', category: 'object', hidden: true },
      ],
    },
    {
      id: 'GreaterThan',
      type: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'A200B200C200D200A200B200C200D200',
      position: { x: 300, y: 140 },
      title: '> (Greater Than)',
      comment: 'Float > Float',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetMathLibrary",MemberName="Greater_FloatFloat")',
      },
      pins: [
        { id: 'A300000000000000A300000000000001', name: 'A', direction: 'input', category: 'real', subCategory: 'double' },
        { id: 'A300000000000000A300000000000002', name: 'B', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '50.0' },
        { id: 'A300000000000000A300000000000003', name: 'ReturnValue', direction: 'output', category: 'bool' },
      ],
    },
    {
      id: 'Branch',
      type: 'flow_control',
      nodeClass: 'K2Node_IfThenElse',
      nodeGuid: 'A300B300C300D300A300B300C300D300',
      position: { x: 320, y: 0 },
      title: 'Branch',
      properties: {},
      pins: [
        { id: 'A400000000000000A400000000000001', name: 'execute', direction: 'input', category: 'exec' },
        { id: 'A400000000000000A400000000000002', name: 'Condition', direction: 'input', category: 'bool' },
        { id: 'A400000000000000A400000000000003', name: 'True', direction: 'output', category: 'exec' },
        { id: 'A400000000000000A400000000000004', name: 'False', direction: 'output', category: 'exec' },
      ],
    },
    {
      id: 'PrintString',
      type: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'A400B400C400D400A400B400C400D400',
      position: { x: 660, y: -30 },
      title: 'Print String',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
      },
      pins: [
        { id: 'A500000000000000A500000000000001', name: 'execute', direction: 'input', category: 'exec' },
        { id: 'A500000000000000A500000000000002', name: 'then', direction: 'output', category: 'exec' },
        { id: 'A500000000000000A500000000000003', name: 'In String', direction: 'input', category: 'string', defaultValue: 'Health OK' },
        { id: 'A500000000000000A500000000000004', name: 'Text Color', direction: 'input', category: 'struct', subCategoryObject: '/Script/CoreUObject.LinearColor', defaultValue: '(R=0.0,G=1.0,B=0.5,A=1.0)' },
      ],
    },
    {
      id: 'DestroyActor',
      type: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'A500B500C500D500A500B500C500D500',
      position: { x: 660, y: 160 },
      title: 'Destroy Actor',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.Actor",MemberName="K2_DestroyActor")',
      },
      pins: [
        { id: 'A600000000000000A600000000000001', name: 'execute', direction: 'input', category: 'exec' },
        { id: 'A600000000000000A600000000000002', name: 'then', direction: 'output', category: 'exec' },
        { id: 'A600000000000000A600000000000003', name: 'Target', direction: 'input', category: 'object', subCategoryObject: '/Script/Engine.Actor', defaultValue: 'self' },
      ],
    },
  ],
  edges: [
    { id: 'e0', source: 'Event_BeginPlay', sourcePin: 'then', target: 'Branch', targetPin: 'execute', category: 'exec' },
    { id: 'e1', source: 'GetHealth', sourcePin: 'Health', target: 'GreaterThan', targetPin: 'A', category: 'real' },
    { id: 'e2', source: 'GreaterThan', sourcePin: 'ReturnValue', target: 'Branch', targetPin: 'Condition', category: 'bool' },
    { id: 'e3', source: 'Branch', sourcePin: 'True', target: 'PrintString', targetPin: 'execute', category: 'exec' },
    { id: 'e4', source: 'Branch', sourcePin: 'False', target: 'DestroyActor', targetPin: 'execute', category: 'exec' },
  ],
};
