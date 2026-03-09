import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  lookupFunction,
  searchFunctions,
  getSignatureDB,
  learnFromGraph,
  _resetForTesting,
  _injectForTesting,
} from '../signature-db';
import type { SignatureData } from '../../types/signature-db';
import type { UEGraphJSON } from '../../types/ue-graph';

// Mock localStorage for Node.js test environment
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

const MOCK_DB: SignatureData = {
  version: '1.0.0',
  stats: { classes: 2, functions: 3, pins: 8 },
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
        ],
      },
    ],
    DestroyActor: [
      {
        memberParent: '/Script/Engine.Actor',
        memberName: 'DestroyActor',
        isPure: false,
        pins: [{ name: 'Return Value', direction: 'output', category: 'bool' }],
      },
      {
        memberParent: '/Script/EditorScriptingUtilities.EditorLevelLibrary',
        memberName: 'DestroyActor',
        isPure: false,
        pins: [{ name: 'Actor To Destroy', direction: 'input', category: 'object' }],
      },
    ],
    AddFloatFloat: [
      {
        memberParent: '/Script/Engine.KismetMathLibrary',
        memberName: 'AddFloatFloat',
        isPure: true,
        pins: [
          { name: 'A', direction: 'input', category: 'real' },
          { name: 'B', direction: 'input', category: 'real' },
          { name: 'Return Value', direction: 'output', category: 'real' },
        ],
      },
    ],
  },
};

beforeEach(() => {
  _resetForTesting();
  localStorageMock.clear();
});

describe('lookupFunction', () => {
  it('returns undefined when DB not loaded', () => {
    expect(lookupFunction('PrintString')).toBeUndefined();
  });

  it('finds entries by memberName', () => {
    _injectForTesting(MOCK_DB);
    const result = lookupFunction('PrintString');
    expect(result).toBeDefined();
    expect(result!.memberParent).toBe('/Script/Engine.KismetSystemLibrary');
    expect(result!.pins).toHaveLength(3);
  });

  it('disambiguates by memberParent', () => {
    _injectForTesting(MOCK_DB);
    const result = lookupFunction('DestroyActor', '/Script/EditorScriptingUtilities.EditorLevelLibrary');
    expect(result).toBeDefined();
    expect(result!.pins[0].name).toBe('Actor To Destroy');
  });

  it('returns first entry when no parent match', () => {
    _injectForTesting(MOCK_DB);
    const result = lookupFunction('DestroyActor');
    expect(result).toBeDefined();
    expect(result!.memberParent).toBe('/Script/Engine.Actor');
  });

  it('normalizes K2_ prefix for lookup', () => {
    _injectForTesting(MOCK_DB);
    const result = lookupFunction('K2_DestroyActor');
    expect(result).toBeDefined();
    expect(result!.memberName).toBe('DestroyActor');
  });

  it('normalizes underscores for lookup (Add_FloatFloat → AddFloatFloat)', () => {
    _injectForTesting(MOCK_DB);
    const result = lookupFunction('Add_FloatFloat');
    expect(result).toBeDefined();
    expect(result!.memberName).toBe('AddFloatFloat');
    expect(result!.isPure).toBe(true);
  });
});

describe('searchFunctions', () => {
  it('returns empty when DB not loaded', () => {
    expect(searchFunctions('Print')).toEqual([]);
  });

  it('finds functions by substring', () => {
    _injectForTesting(MOCK_DB);
    const results = searchFunctions('Print');
    expect(results).toHaveLength(1);
    expect(results[0].memberName).toBe('PrintString');
  });

  it('respects limit', () => {
    _injectForTesting(MOCK_DB);
    const results = searchFunctions('a', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});

describe('getSignatureDB', () => {
  it('returns null before loading', () => {
    expect(getSignatureDB()).toBeNull();
  });

  it('returns data after injection', () => {
    _injectForTesting(MOCK_DB);
    expect(getSignatureDB()).toBe(MOCK_DB);
  });
});

describe('learnFromGraph', () => {
  it('learns new functions from parsed graph', () => {
    _injectForTesting(MOCK_DB);

    const graph: UEGraphJSON = {
      metadata: { title: 'Test', assetPath: '/Game/Test' },
      nodes: [
        {
          id: 'n1',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'AAAA1111',
          position: { x: 0, y: 0 },
          title: 'MyCustomFunction',
          properties: {
            FunctionReference: '(MemberParent="/Game/BP_Custom",MemberName="MyCustomFunction")',
          },
          pins: [
            { id: 'p1', name: 'execute', friendlyName: 'execute', direction: 'input', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
            { id: 'p2', name: 'Value', friendlyName: 'Value', direction: 'input', category: 'real', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '42.0', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
          ],
        },
      ],
      edges: [],
    };

    const count = learnFromGraph(graph);
    expect(count).toBe(1);

    // Should now be findable via lookup
    const result = lookupFunction('MyCustomFunction');
    expect(result).toBeDefined();
    expect(result!.memberParent).toBe('/Game/BP_Custom');
  });

  it('does not learn functions already in static DB', () => {
    _injectForTesting(MOCK_DB);

    const graph: UEGraphJSON = {
      metadata: { title: 'Test', assetPath: '/Game/Test' },
      nodes: [
        {
          id: 'n1',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'BBBB2222',
          position: { x: 0, y: 0 },
          title: 'Print String',
          properties: {
            FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
          },
          pins: [
            { id: 'p1', name: 'execute', friendlyName: 'execute', direction: 'input', category: 'exec', subCategory: '', subCategoryObject: '', containerType: '', defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
          ],
        },
      ],
      edges: [],
    };

    const count = learnFromGraph(graph);
    expect(count).toBe(0);
  });

  it('respects LRU eviction limit', () => {
    _injectForTesting(MOCK_DB);

    // Create a graph with 501+ unique functions
    const nodes = Array.from({ length: 510 }, (_, i) => ({
      id: `n${i}`,
      type: 'call_function',
      nodeClass: 'K2Node_CallFunction',
      nodeGuid: `${i.toString(16).padStart(8, '0')}`,
      position: { x: 0, y: 0 },
      title: `Func${i}`,
      properties: {
        FunctionReference: `(MemberParent="/Game/BP",MemberName="Func${i}")`,
      },
      pins: [
        { id: `p${i}`, name: 'X', friendlyName: 'X', direction: 'input' as const, category: 'real' as const, subCategory: '', subCategoryObject: '', containerType: '' as const, defaultValue: '', isReference: false, isConst: false, isWeak: false, hidden: false, advancedView: false },
      ],
    }));

    learnFromGraph({ metadata: { title: 'T', assetPath: '/Game/T' }, nodes, edges: [] });

    // Newest entries should survive, oldest should be evicted
    const newest = lookupFunction('Func509');
    expect(newest).toBeDefined();

    // Entry 0-9 should be evicted (510 - 500 = 10 evicted)
    const oldest = lookupFunction('Func0');
    expect(oldest).toBeUndefined();
  });
});
