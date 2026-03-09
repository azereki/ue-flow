import { describe, it, expect } from 'vitest';
import { parseGeneratedGraph, normalizeGeneratedPin, offsetGraphPositions } from '../ai-generate';
import { isGenerationRequest } from '../../hooks/useAIChat';
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

  it('returns null for nodes with empty pins array', () => {
    const emptyPins = '```json\n{"metadata":{"title":"T"},"nodes":[{"id":"n","title":"N","nodeClass":"K2Node_Event","nodeGuid":"AAAA","position":{"x":0,"y":0},"properties":{},"pins":[]}],"edges":[]}\n```';
    expect(parseGeneratedGraph(emptyPins)).toBeNull();
  });

  it('generates valid 32-char hex nodeGuids', () => {
    const result = parseGeneratedGraph(VALID_RESPONSE);
    expect(result).not.toBeNull();
    for (const node of result!.nodes) {
      expect(node.nodeGuid).toMatch(/^[0-9A-F]{32}$/);
    }
  });

  it('deduplicates nodeGuids across nodes', () => {
    const result = parseGeneratedGraph(VALID_RESPONSE);
    expect(result).not.toBeNull();
    const guids = result!.nodes.map((n) => n.nodeGuid);
    expect(new Set(guids).size).toBe(guids.length);
  });

  it('drops edges referencing non-existent pins', () => {
    const response = `\`\`\`json
{
  "metadata": { "title": "T", "assetPath": "/Game/T" },
  "nodes": [
    { "id": "A", "type": "event", "nodeClass": "K2Node_Event", "nodeGuid": "1234", "position": {"x":0,"y":0}, "title": "N", "properties": {}, "pins": [{"id": "p1", "name": "then", "direction": "output", "category": "exec"}] },
    { "id": "B", "type": "call_function", "nodeClass": "K2Node_CallFunction", "nodeGuid": "5678", "position": {"x":300,"y":0}, "title": "M", "properties": {}, "pins": [{"id": "p2", "name": "execute", "direction": "input", "category": "exec"}] }
  ],
  "edges": [
    { "id": "e0", "source": "A", "sourcePin": "then", "target": "B", "targetPin": "execute", "category": "exec" },
    { "id": "e1", "source": "A", "sourcePin": "FAKE_PIN", "target": "B", "targetPin": "execute", "category": "exec" }
  ]
}
\`\`\``;
    const result = parseGeneratedGraph(response);
    expect(result).not.toBeNull();
    expect(result!.edges).toHaveLength(1);
    expect(result!.edges[0].id).toBe('e0');
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

describe('isGenerationRequest', () => {
  it('triggers on strong generation signals', () => {
    expect(isGenerationRequest('generate a health system')).toBe(true);
    expect(isGenerationRequest('create a blueprint for damage')).toBe(true);
    expect(isGenerationRequest('build me a movement system')).toBe(true);
    expect(isGenerationRequest('add nodes for health regen')).toBe(true);
    expect(isGenerationRequest('wire up a timer loop')).toBe(true);
    expect(isGenerationRequest('implement a save system')).toBe(true);
  });

  it('triggers on blueprint/graph/nodes phrases', () => {
    expect(isGenerationRequest('I need a blueprint that handles input')).toBe(true);
    expect(isGenerationRequest('give me nodes for jumping')).toBe(true);
    expect(isGenerationRequest('a graph that manages inventory')).toBe(true);
  });

  it('does NOT trigger on questions with weak signals', () => {
    expect(isGenerationRequest('what does this node make?')).toBe(false);
    expect(isGenerationRequest('how does this build work?')).toBe(false);
    expect(isGenerationRequest('why does this create an error?')).toBe(false);
    expect(isGenerationRequest('what is this set up for?')).toBe(false);
  });

  it('triggers weak signals when not a question', () => {
    expect(isGenerationRequest('make a damage calculation')).toBe(true);
    expect(isGenerationRequest('set up a timer loop')).toBe(true);
  });

  it('does NOT trigger on plain analytical questions', () => {
    expect(isGenerationRequest('what does this graph do?')).toBe(false);
    expect(isGenerationRequest('explain the execution flow')).toBe(false);
    expect(isGenerationRequest('how many nodes are there?')).toBe(false);
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
