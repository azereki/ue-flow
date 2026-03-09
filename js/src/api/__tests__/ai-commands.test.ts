import { describe, it, expect } from 'vitest';
import { isCommandRequest, parseAICommands, COMMAND_SCHEMA_ADDENDUM } from '../ai-commands';

describe('isCommandRequest', () => {
  it('detects deletion requests', () => {
    expect(isCommandRequest('delete the Print String node')).toBe(true);
    expect(isCommandRequest('remove the Delay node')).toBe(true);
  });

  it('detects connection requests', () => {
    expect(isCommandRequest('connect BeginPlay to Delay')).toBe(true);
    expect(isCommandRequest('wire the Branch true output to Delay')).toBe(true);
    expect(isCommandRequest('disconnect BeginPlay from Print String')).toBe(true);
  });

  it('detects value changes', () => {
    expect(isCommandRequest('set the value of Duration to 3.0')).toBe(true);
    expect(isCommandRequest('change the value of In String')).toBe(true);
    expect(isCommandRequest('set pin Duration to 5')).toBe(true);
  });

  it('detects rename requests', () => {
    expect(isCommandRequest('rename the variable to Health')).toBe(true);
  });

  it('detects node addition requests', () => {
    expect(isCommandRequest('add a node for Delay')).toBe(true);
    expect(isCommandRequest('insert a node between these two')).toBe(true);
  });

  it('does not trigger on analysis questions', () => {
    expect(isCommandRequest('what does this graph do?')).toBe(false);
    expect(isCommandRequest('explain the execution flow')).toBe(false);
    expect(isCommandRequest('how many nodes are there?')).toBe(false);
  });
});

describe('parseAICommands', () => {
  it('parses valid command JSON', () => {
    const text = 'Here are the changes:\n```json\n{"commands": [{"action": "deleteNode", "params": {"nodeTitle": "Print String"}}], "explanation": "Removed Print String."}\n```';
    const result = parseAICommands(text);
    expect(result).not.toBeNull();
    expect(result!.commands).toHaveLength(1);
    expect(result!.commands[0].action).toBe('deleteNode');
    expect(result!.explanation).toBe('Removed Print String.');
  });

  it('parses multiple commands', () => {
    const text = '```json\n{"commands": [{"action": "addEdge", "params": {"sourceTitle": "A", "sourcePin": "then", "targetTitle": "B", "targetPin": "execute"}}, {"action": "setPinValue", "params": {"nodeTitle": "B", "pinName": "Duration", "value": "2.0"}}]}\n```';
    const result = parseAICommands(text);
    expect(result).not.toBeNull();
    expect(result!.commands).toHaveLength(2);
  });

  it('returns null for UEGraphJSON (has nodes array)', () => {
    const text = '```json\n{"nodes": [{"id": "n1"}], "edges": []}\n```';
    expect(parseAICommands(text)).toBeNull();
  });

  it('returns null for non-JSON response', () => {
    expect(parseAICommands('This graph has 3 nodes.')).toBeNull();
  });

  it('returns null for empty commands array', () => {
    const text = '```json\n{"commands": []}\n```';
    expect(parseAICommands(text)).toBeNull();
  });
});

describe('COMMAND_SCHEMA_ADDENDUM', () => {
  it('is a non-empty string', () => {
    expect(typeof COMMAND_SCHEMA_ADDENDUM).toBe('string');
    expect(COMMAND_SCHEMA_ADDENDUM.length).toBeGreaterThan(100);
  });

  it('documents all major command actions', () => {
    const actions = ['deleteNode', 'deleteEdge', 'addEdge', 'addNode', 'setPinValue', 'setNodeTitle', 'duplicateNode'];
    for (const action of actions) {
      expect(COMMAND_SCHEMA_ADDENDUM).toContain(action);
    }
  });
});
