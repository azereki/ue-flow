import { describe, it, expect, beforeEach } from 'vitest';
import { validateGeneratedGraph } from '../graph-validator';
import { _resetForTesting, _injectForTesting } from '../signature-db';
import type { SignatureData } from '../../types/signature-db';
import type { UEGraphJSON, UENode } from '../../types/ue-graph';

const MOCK_DB: SignatureData = {
  version: '1.0.0',
  stats: { classes: 1, functions: 2, pins: 6 },
  functions: {
    PrintString: [
      {
        memberParent: '/Script/Engine.KismetSystemLibrary',
        memberName: 'PrintString',
        isPure: false,
        pins: [
          { name: 'String', direction: 'input', category: 'string', defaultValue: 'Hello' },
          { name: 'Print To Screen', direction: 'input', category: 'bool', defaultValue: 'True' },
          { name: 'Print To Log', direction: 'input', category: 'bool', defaultValue: 'True' },
          { name: 'Text Color', direction: 'input', category: 'struct', subCategoryObject: '/Script/CoreUObject.LinearColor' },
          { name: 'Duration', direction: 'input', category: 'real', defaultValue: '2.0' },
        ],
      },
    ],
    Delay: [
      {
        memberParent: '/Script/Engine.KismetSystemLibrary',
        memberName: 'Delay',
        isPure: false,
        pins: [
          { name: 'Duration', direction: 'input', category: 'real', defaultValue: '0.2' },
        ],
      },
    ],
  },
};

function makeNode(overrides: Partial<UENode>): UENode {
  return {
    id: 'n1',
    type: 'call_function',
    nodeClass: 'K2Node_CallFunction',
    nodeGuid: 'AAAA1111',
    position: { x: 0, y: 0 },
    title: 'Test',
    properties: {},
    pins: [],
    ...overrides,
  };
}

function makeGraph(nodes: UENode[]): UEGraphJSON {
  return {
    metadata: { title: 'Test', assetPath: '/Game/Test' },
    nodes,
    edges: [],
  };
}

beforeEach(() => {
  _resetForTesting();
  _injectForTesting(MOCK_DB);
});

describe('validateGeneratedGraph', () => {
  it('corrects wrong memberParent', () => {
    const node = makeNode({
      title: 'Print String',
      properties: {
        FunctionReference: '(MemberParent="/Script/Wrong.Wrong",MemberName="PrintString")',
      },
      pins: [
        { id: 'p1', name: 'String', friendlyName: 'String', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    expect(result.corrections.length).toBeGreaterThan(0);
    expect(result.corrections.some((c) => c.includes('memberParent'))).toBe(true);

    const props = result.graph.nodes[0].properties;
    expect(String(props['FunctionReference'])).toContain('KismetSystemLibrary');
  });

  it('fixes pin categories (float → real)', () => {
    const node = makeNode({
      title: 'Delay',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="Delay")',
      },
      pins: [
        { id: 'p1', name: 'Duration', friendlyName: 'Duration', direction: 'input', category: 'float' as 'real', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    // Exec pins may be prepended for impure functions — find Duration pin by name
    const durationPin = result.graph.nodes[0].pins.find((p) => p.name === 'Duration');
    expect(durationPin?.category).toBe('real');
  });

  it('fills missing pin defaults from signature', () => {
    const node = makeNode({
      title: 'Print String',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
      },
      pins: [
        { id: 'p1', name: 'String', friendlyName: 'String', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    // Exec pins may be prepended — find String pin by name
    const stringPin = result.graph.nodes[0].pins.find((p) => p.name === 'String');
    expect(stringPin?.defaultValue).toBe('Hello');
  });

  it('adds missing required pins from signature', () => {
    const node = makeNode({
      title: 'Print String',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
      },
      pins: [
        { id: 'p1', name: 'String', friendlyName: 'String', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: 'Test', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    // Should have added missing pins from signature (Print To Screen, Print To Log, etc.)
    expect(result.graph.nodes[0].pins.length).toBeGreaterThan(1);
    expect(result.corrections.some((c) => c.includes('Added missing pin'))).toBe(true);
  });

  it('preserves extra AI-added pins (dynamic pins)', () => {
    const node = makeNode({
      title: 'Print String',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
      },
      pins: [
        { id: 'p1', name: 'String', friendlyName: 'String', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: 'Hello', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: 'p-custom', name: 'CustomDynamic', friendlyName: 'CustomDynamic', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    const pinNames = result.graph.nodes[0].pins.map((p) => p.name);
    expect(pinNames).toContain('CustomDynamic');
  });

  it('returns warnings for unknown functions', () => {
    const node = makeNode({
      title: 'UnknownFunction',
      properties: {
        FunctionReference: '(MemberParent="/Game/Custom",MemberName="TotallyFake")',
      },
      pins: [
        { id: 'p1', name: 'X', friendlyName: 'X', direction: 'input', category: 'real', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Unknown function');
  });

  it('passes through nodes without function references', () => {
    const node = makeNode({
      title: 'Branch',
      nodeClass: 'K2Node_IfThenElse',
      properties: {},
      pins: [
        { id: 'p1', name: 'Condition', friendlyName: 'Condition', direction: 'input', category: 'bool', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    expect(result.corrections).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.graph.nodes[0].pins).toHaveLength(1);
  });

  it('injects exec pins for impure functions missing them', () => {
    const node = makeNode({
      title: 'Print String',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
      },
      pins: [
        // Impure function but AI forgot exec pins — only has data pins
        { id: 'p1', name: 'String', friendlyName: 'String', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: 'Hello', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    const pins = result.graph.nodes[0].pins;
    const execIn = pins.find((p) => p.category === 'exec' && p.direction === 'input');
    const execOut = pins.find((p) => p.category === 'exec' && p.direction === 'output');
    expect(execIn).toBeDefined();
    expect(execOut).toBeDefined();
    expect(result.corrections.some((c) => c.includes('exec input'))).toBe(true);
    expect(result.corrections.some((c) => c.includes('exec output'))).toBe(true);
  });

  it('does not inject exec pins for pure functions', () => {
    // Inject a pure function into mock DB
    _resetForTesting();
    _injectForTesting({
      ...MOCK_DB,
      functions: {
        ...MOCK_DB.functions,
        MakeLiteralBool: [{
          memberParent: '/Script/Engine.KismetSystemLibrary',
          memberName: 'MakeLiteralBool',
          isPure: true,
          pins: [
            { name: 'Value', direction: 'input', category: 'bool' },
            { name: 'ReturnValue', direction: 'output', category: 'bool' },
          ],
        }],
      },
    });

    const node = makeNode({
      title: 'MakeLiteralBool',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="MakeLiteralBool")',
      },
      pins: [
        { id: 'p1', name: 'Value', friendlyName: 'Value', direction: 'input', category: 'bool', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    const execPins = result.graph.nodes[0].pins.filter((p) => p.category === 'exec');
    expect(execPins).toHaveLength(0);
  });

  it('fills subCategoryObject from signature', () => {
    const node = makeNode({
      title: 'Print String',
      properties: {
        FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
      },
      pins: [
        { id: 'p1', name: 'String', friendlyName: 'String', direction: 'input', category: 'string', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: 'Test', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
        { id: 'p2', name: 'Text Color', friendlyName: 'Text Color', direction: 'input', category: 'struct', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    });

    const result = validateGeneratedGraph(makeGraph([node]));
    const colorPin = result.graph.nodes[0].pins.find((p) => p.name === 'Text Color');
    expect(colorPin?.subCategoryObject).toBe('/Script/CoreUObject.LinearColor');
  });
});
