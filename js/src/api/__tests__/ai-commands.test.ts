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

// ─── Additional isCommandRequest tests ───────────────────────────────────────

describe('isCommandRequest — extended', () => {
  it('detects duplicate/clone requests', () => {
    expect(isCommandRequest('duplicate the Delay node')).toBe(true);
    expect(isCommandRequest('clone the branch')).toBe(true);
    expect(isCommandRequest('copy the Print String node')).toBe(true);
  });

  it('detects annotation requests', () => {
    expect(isCommandRequest('annotate the Delay node with a note')).toBe(true);
    expect(isCommandRequest('add a note to Print String')).toBe(true);
    expect(isCommandRequest('add comment about this section')).toBe(true);
  });

  it('detects move/reposition requests', () => {
    expect(isCommandRequest('move the node to the right')).toBe(true);
    expect(isCommandRequest('reposition the Branch node')).toBe(true);
    expect(isCommandRequest('move it down')).toBe(true);
  });

  it('returns false for generation requests', () => {
    expect(isCommandRequest('generate a health regen system')).toBe(false);
    expect(isCommandRequest('create a blueprint for inventory')).toBe(false);
  });

  it('returns false for plain questions', () => {
    expect(isCommandRequest('what is the purpose of this node?')).toBe(false);
    expect(isCommandRequest('how does the execution flow work?')).toBe(false);
    expect(isCommandRequest('is this graph efficient?')).toBe(false);
  });
});

// ─── Extended parseAICommands tests ──────────────────────────────────────────

describe('parseAICommands — extended', () => {
  it('parses deleteNode command', () => {
    const text = '```json\n{"commands": [{"action": "deleteNode", "params": {"nodeTitle": "Delay"}}]}\n```';
    const result = parseAICommands(text);
    expect(result).not.toBeNull();
    expect(result!.commands[0].action).toBe('deleteNode');
    expect(result!.commands[0].params.nodeTitle).toBe('Delay');
  });

  it('parses deleteEdge command', () => {
    const text = '```json\n{"commands": [{"action": "deleteEdge", "params": {"sourceTitle": "Event BeginPlay", "sourcePin": "then", "targetTitle": "Delay", "targetPin": "execute"}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('deleteEdge');
    expect(result!.commands[0].params.sourceTitle).toBe('Event BeginPlay');
  });

  it('parses addEdge command', () => {
    const text = '```json\n{"commands": [{"action": "addEdge", "params": {"sourceTitle": "A", "sourcePin": "then", "targetTitle": "B", "targetPin": "execute"}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('addEdge');
  });

  it('parses addNode command with position', () => {
    const text = '```json\n{"commands": [{"action": "addNode", "params": {"memberName": "PrintString", "position": {"x": 400, "y": 200}}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('addNode');
    expect(result!.commands[0].params.memberName).toBe('PrintString');
    const pos = result!.commands[0].params.position as { x: number; y: number };
    expect(pos.x).toBe(400);
  });

  it('parses setPinValue command', () => {
    const text = '```json\n{"commands": [{"action": "setPinValue", "params": {"nodeTitle": "Delay", "pinName": "Duration", "value": "2.0"}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('setPinValue');
    expect(result!.commands[0].params.value).toBe('2.0');
  });

  it('parses setNodeTitle command', () => {
    const text = '```json\n{"commands": [{"action": "setNodeTitle", "params": {"nodeTitle": "Old Name", "newTitle": "New Name"}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('setNodeTitle');
    expect(result!.commands[0].params.newTitle).toBe('New Name');
  });

  it('parses duplicateNode command', () => {
    const text = '```json\n{"commands": [{"action": "duplicateNode", "params": {"nodeTitle": "Print String"}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('duplicateNode');
  });

  it('parses annotateNode command', () => {
    const text = '```json\n{"commands": [{"action": "annotateNode", "params": {"nodeTitle": "Delay", "text": "Wait 2 seconds"}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('annotateNode');
    expect(result!.commands[0].params.text).toBe('Wait 2 seconds');
  });

  it('parses moveNode command', () => {
    const text = '```json\n{"commands": [{"action": "moveNode", "params": {"nodeTitle": "Branch", "x": 500, "y": 300}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('moveNode');
    expect(result!.commands[0].params.x).toBe(500);
  });

  it('parses addComment command', () => {
    const text = '```json\n{"commands": [{"action": "addComment", "params": {"text": "Main Logic", "position": {"x": 0, "y": -100}, "width": 400, "height": 200}}]}\n```';
    const result = parseAICommands(text);
    expect(result!.commands[0].action).toBe('addComment');
    expect(result!.commands[0].params.text).toBe('Main Logic');
  });

  it('handles malformed JSON gracefully', () => {
    const text = '```json\n{broken json\n```';
    expect(parseAICommands(text)).toBeNull();
  });

  it('skips commands with missing action field', () => {
    const text = '```json\n{"commands": [{"params": {"nodeTitle": "X"}}, {"action": "deleteNode", "params": {"nodeTitle": "Y"}}]}\n```';
    const result = parseAICommands(text);
    expect(result).not.toBeNull();
    expect(result!.commands).toHaveLength(1);
    expect(result!.commands[0].action).toBe('deleteNode');
  });

  it('handles commands with missing params gracefully', () => {
    const text = '```json\n{"commands": [{"action": "deleteNode"}]}\n```';
    const result = parseAICommands(text);
    expect(result).not.toBeNull();
    expect(result!.commands[0].params).toEqual({});
  });

  it('returns null when JSON has no json code block', () => {
    const text = 'Here is my response with no code block.';
    expect(parseAICommands(text)).toBeNull();
  });
});
