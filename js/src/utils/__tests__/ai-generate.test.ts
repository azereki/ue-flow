import { describe, it, expect } from 'vitest';
import { parseGeneratedGraph, normalizeGeneratedPin, offsetGraphPositions } from '../ai-generate';
import { graphJsonToFlow } from '../../transform/json-to-flow';

const VALID_RESPONSE = `Here's your Blueprint:

\`\`\`json
{
  "metadata": { "title": "EventGraph", "assetPath": "/Game/BP_Test" },
  "nodes": [
    {
      "id": "BeginPlay", "type": "event", "nodeClass": "K2Node_Event",
      "nodeGuid": "AAAA1111", "position": { "x": 0, "y": 0 },
      "title": "Event BeginPlay", "properties": {},
      "pins": [{ "id": "bp-then", "name": "then", "direction": "output", "category": "exec" }]
    },
    {
      "id": "PrintString", "type": "call_function", "nodeClass": "K2Node_CallFunction",
      "nodeGuid": "BBBB2222", "position": { "x": 300, "y": 0 },
      "title": "Print String", "properties": {},
      "pins": [
        { "id": "ps-exec", "name": "execute", "direction": "input", "category": "exec" },
        { "id": "ps-then", "name": "then", "direction": "output", "category": "exec" },
        { "id": "ps-str", "name": "In String", "direction": "input", "category": "string", "defaultValue": "Hello" }
      ]
    }
  ],
  "edges": [
    { "id": "e0", "source": "BeginPlay", "sourcePin": "then", "target": "PrintString", "targetPin": "execute", "category": "exec" }
  ]
}
\`\`\`
`;

describe('parseGeneratedGraph', () => {
  it('parses valid JSON from AI response', () => {
    const result = parseGeneratedGraph(VALID_RESPONSE);
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(2);
    expect(result!.edges).toHaveLength(1);
    expect(result!.metadata.title).toBe('EventGraph');
  });

  it('returns null for response without JSON block', () => {
    expect(parseGeneratedGraph('No JSON here')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseGeneratedGraph('```json\n{invalid\n```')).toBeNull();
  });

  it('returns null for JSON missing required fields', () => {
    const noNodes = '```json\n{"metadata":{"title":"T"},"nodes":[],"edges":[]}\n```';
    expect(parseGeneratedGraph(noNodes)).toBeNull();
  });

  it('returns null for nodes missing pins', () => {
    const noPins = '```json\n{"metadata":{"title":"T"},"nodes":[{"id":"n","title":"N"}],"edges":[]}\n```';
    expect(parseGeneratedGraph(noPins)).toBeNull();
  });

  it('normalizes invalid node types to call_function', () => {
    const response = '```json\n{"metadata":{"title":"T","assetPath":"/Game/T"},"nodes":[{"id":"n","type":"bogus","nodeClass":"K2Node","nodeGuid":"1234","position":{"x":0,"y":0},"title":"N","properties":{},"pins":[{"id":"p","name":"P","direction":"input","category":"exec"}]}],"edges":[]}\n```';
    const result = parseGeneratedGraph(response);
    expect(result).not.toBeNull();
    expect(result!.nodes[0].type).toBe('call_function');
  });

  it('skips edges with missing fields', () => {
    const response = '```json\n{"metadata":{"title":"T","assetPath":"/Game/T"},"nodes":[{"id":"n","type":"event","nodeClass":"K2Node_Event","nodeGuid":"1234","position":{"x":0,"y":0},"title":"N","properties":{},"pins":[{"id":"p","name":"then","direction":"output","category":"exec"}]}],"edges":[{"id":"e0"},{"id":"e1","source":"n","sourcePin":"then","target":"n","targetPin":"then","category":"exec"}]}\n```';
    const result = parseGeneratedGraph(response);
    expect(result).not.toBeNull();
    expect(result!.edges).toHaveLength(1);
  });
});

describe('normalizeGeneratedPin', () => {
  it('fills defaults for minimal pin', () => {
    const pin = normalizeGeneratedPin({ id: 'p1', name: 'Test', direction: 'input', category: 'bool' });
    expect(pin.friendlyName).toBe('Test');
    expect(pin.subCategory).toBe('');
    expect(pin.containerType).toBe('');
    expect(pin.defaultValue).toBe('');
    expect(pin.isReference).toBe(false);
    expect(pin.hidden).toBe(false);
  });

  it('preserves provided values', () => {
    const pin = normalizeGeneratedPin({
      id: 'p1', name: 'Health', direction: 'output', category: 'real',
      defaultValue: '100.0', friendlyName: 'Player Health',
    });
    expect(pin.defaultValue).toBe('100.0');
    expect(pin.friendlyName).toBe('Player Health');
  });

  it('uses subType as subCategory fallback', () => {
    const pin = normalizeGeneratedPin({
      id: 'p1', name: 'Val', direction: 'output', category: 'real',
      subType: 'double',
    } as Partial<UEPin> & { subType?: string });
    expect(pin.subCategory).toBe('double');
  });

  it('defaults invalid category to wildcard', () => {
    const pin = normalizeGeneratedPin({ id: 'p1', name: 'X', direction: 'input', category: 'bogus' as 'exec' });
    expect(pin.category).toBe('wildcard');
  });
});

describe('offsetGraphPositions', () => {
  it('shifts all node positions', () => {
    const result = parseGeneratedGraph(VALID_RESPONSE)!;
    const offset = offsetGraphPositions(result, 500, 200);
    expect(offset.nodes[0].position).toEqual({ x: 500, y: 200 });
    expect(offset.nodes[1].position).toEqual({ x: 800, y: 200 });
    // Original unchanged
    expect(result.nodes[0].position).toEqual({ x: 0, y: 0 });
  });
});

describe('round-trip: parse → graphJsonToFlow', () => {
  it('produces valid React Flow nodes and edges', () => {
    const graph = parseGeneratedGraph(VALID_RESPONSE)!;
    const flow = graphJsonToFlow(graph);
    expect(flow.nodes.length).toBeGreaterThan(0);
    expect(flow.edges.length).toBeGreaterThan(0);
    expect(flow.nodes[0].type).toBe('blueprintNode');
  });
});
