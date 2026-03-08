import type { UEGraphJSON } from '../types/ue-graph';

/**
 * Sample Blueprint graph for the landing page live demo.
 * BeginPlay → Branch → PrintString (true) / DestroyActor (false),
 * with a float variable feeding into the Branch condition via comparison.
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
      nodeGuid: 'A000B000C000D000',
      position: { x: 0, y: 0 },
      title: 'Event BeginPlay',
      properties: {},
      pins: [
        { id: 'bp-then', name: 'then', direction: 'output', category: 'exec' },
      ],
    },
    {
      id: 'GetHealth',
      type: 'variable_get',
      nodeClass: 'K2Node_VariableGet',
      nodeGuid: 'A100B100C100D100',
      position: { x: 40, y: 180 },
      title: 'Get Health',
      properties: {},
      pins: [
        { id: 'gh-out', name: 'Health', direction: 'output', category: 'real', subType: 'double' },
      ],
    },
    {
      id: 'GreaterThan',
      type: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'A200B200C200D200',
      position: { x: 300, y: 140 },
      title: '> (Greater Than)',
      comment: 'Float > Float',
      properties: {},
      pins: [
        { id: 'gt-a', name: 'A', direction: 'input', category: 'real', subType: 'double' },
        { id: 'gt-b', name: 'B', direction: 'input', category: 'real', subType: 'double', defaultValue: '50.0' },
        { id: 'gt-out', name: 'ReturnValue', direction: 'output', category: 'bool' },
      ],
    },
    {
      id: 'Branch',
      type: 'flow_control',
      nodeClass: 'K2Node_IfThenElse',
      nodeGuid: 'A300B300C300D300',
      position: { x: 320, y: 0 },
      title: 'Branch',
      properties: {},
      pins: [
        { id: 'br-exec', name: 'execute', direction: 'input', category: 'exec' },
        { id: 'br-cond', name: 'Condition', direction: 'input', category: 'bool' },
        { id: 'br-true', name: 'True', direction: 'output', category: 'exec' },
        { id: 'br-false', name: 'False', direction: 'output', category: 'exec' },
      ],
    },
    {
      id: 'PrintString',
      type: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'A400B400C400D400',
      position: { x: 660, y: -30 },
      title: 'Print String',
      properties: {},
      pins: [
        { id: 'ps-exec', name: 'execute', direction: 'input', category: 'exec' },
        { id: 'ps-then', name: 'then', direction: 'output', category: 'exec' },
        { id: 'ps-str', name: 'In String', direction: 'input', category: 'string', defaultValue: 'Health OK' },
        { id: 'ps-color', name: 'Text Color', direction: 'input', category: 'struct', subType: '/Script/CoreUObject.LinearColor', defaultValue: '(R=0.0,G=1.0,B=0.5,A=1.0)' },
      ],
    },
    {
      id: 'DestroyActor',
      type: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: 'A500B500C500D500',
      position: { x: 660, y: 160 },
      title: 'Destroy Actor',
      properties: {},
      pins: [
        { id: 'da-exec', name: 'execute', direction: 'input', category: 'exec' },
        { id: 'da-then', name: 'then', direction: 'output', category: 'exec' },
        { id: 'da-target', name: 'Target', direction: 'input', category: 'object', subType: '/Script/Engine.Actor', defaultValue: 'self' },
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
