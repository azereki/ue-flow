import { describe, it, expect } from 'vitest';
import { DYNAMIC_PIN_CLASSES, generateNextPin, canRemovePin } from '../dynamic-pins';

import type { UEPin } from '../../types/ue-graph';

function makePin(overrides: Partial<UEPin> = {}): UEPin {
  return {
    id: 'AAAA0000BBBB1111CCCC2222DDDD3333',
    name: 'test',
    friendlyName: 'test',
    direction: 'output',
    category: 'exec',
    subCategory: '',
    subCategoryObject: '',
    containerType: '',
    defaultValue: '',
    isReference: false,
    isConst: false,
    isWeak: false,
    hidden: false,
    advancedView: false,
    ...overrides,
  };
}

describe('DYNAMIC_PIN_CLASSES', () => {
  it('has entries for all expected node classes', () => {
    const expectedClasses = [
      'K2Node_ExecutionSequence',
      'K2Node_MakeArray',
      'K2Node_Select',
      'K2Node_SwitchInteger',
      'K2Node_MultiGate',
      'K2Node_SwitchEnum',
      'K2Node_SwitchString',
      'K2Node_SwitchName',
    ];
    for (const cls of expectedClasses) {
      expect(DYNAMIC_PIN_CLASSES.has(cls)).toBe(true);
    }
  });

  it('also includes K2Node_CommutativeAssociativeBinaryOperator', () => {
    expect(DYNAMIC_PIN_CLASSES.has('K2Node_CommutativeAssociativeBinaryOperator')).toBe(true);
  });

  it('returns undefined for unknown classes via Map.get', () => {
    expect(DYNAMIC_PIN_CLASSES.get('K2Node_Unknown')).toBeUndefined();
  });
});

describe('generateNextPin', () => {
  it('creates a pin with correct category and direction for Sequence', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_ExecutionSequence')!;
    const pin = generateNextPin([], config);
    expect(pin.category).toBe('exec');
    expect(pin.direction).toBe('output');
  });

  it('names the first Sequence pin "Then 0"', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_ExecutionSequence')!;
    const pin = generateNextPin([], config);
    expect(pin.name).toBe('Then 0');
    expect(pin.friendlyName).toBe('Then 0');
  });

  it('increments naming correctly for Sequence pins', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_ExecutionSequence')!;
    const existing = [
      makePin({ name: 'Then 0', direction: 'output', category: 'exec' }),
      makePin({ name: 'Then 1', direction: 'output', category: 'exec' }),
    ];
    const pin = generateNextPin(existing, config);
    expect(pin.name).toBe('Then 2');
  });

  it('creates wildcard pins for MakeArray', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_MakeArray')!;
    const pin = generateNextPin([], config);
    expect(pin.category).toBe('wildcard');
    expect(pin.direction).toBe('input');
    expect(pin.name).toBe('[0]');
  });

  it('creates wildcard input pins for Select', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_Select')!;
    const pin = generateNextPin([], config);
    expect(pin.category).toBe('wildcard');
    expect(pin.direction).toBe('input');
    expect(pin.name).toBe('Option 0');
  });

  it('creates exec output pins for SwitchInteger', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_SwitchInteger')!;
    const pin = generateNextPin([], config);
    expect(pin.category).toBe('exec');
    expect(pin.direction).toBe('output');
    expect(pin.name).toBe('0');
  });

  it('creates exec output pins for MultiGate', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_MultiGate')!;
    const pin = generateNextPin([], config);
    expect(pin.category).toBe('exec');
    expect(pin.direction).toBe('output');
    expect(pin.name).toBe('Out 0');
  });

  it('generates a valid 32-char hex GUID for pin id', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_ExecutionSequence')!;
    const pin = generateNextPin([], config);
    expect(pin.id).toMatch(/^[0-9A-F]{32}$/);
  });

  it('excludes hidden pins from count', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_ExecutionSequence')!;
    const existing = [
      makePin({ name: 'Then 0', direction: 'output', category: 'exec', hidden: false }),
      makePin({ name: 'hidden-exec', direction: 'output', category: 'exec', hidden: true }),
    ];
    const pin = generateNextPin(existing, config);
    // Only 1 visible pin, so next index is 1
    expect(pin.name).toBe('Then 1');
  });

  it('creates real category pins for CommutativeAssociativeBinaryOperator', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_CommutativeAssociativeBinaryOperator')!;
    const pin = generateNextPin([], config);
    expect(pin.category).toBe('real');
    expect(pin.direction).toBe('input');
  });
});

describe('canRemovePin', () => {
  it('allows removal when above minPins', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_ExecutionSequence')!;
    const existing = [
      makePin({ direction: 'output', category: 'exec' }),
      makePin({ direction: 'output', category: 'exec' }),
      makePin({ direction: 'output', category: 'exec' }),
    ];
    expect(canRemovePin(existing, config)).toBe(true);
  });

  it('prevents removal at minPins', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_ExecutionSequence')!;
    // minPins is 2
    const existing = [
      makePin({ direction: 'output', category: 'exec' }),
      makePin({ direction: 'output', category: 'exec' }),
    ];
    expect(canRemovePin(existing, config)).toBe(false);
  });

  it('allows removal for MakeArray when above minPins of 1', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_MakeArray')!;
    const existing = [
      makePin({ direction: 'input', category: 'wildcard' }),
      makePin({ direction: 'input', category: 'wildcard' }),
    ];
    expect(canRemovePin(existing, config)).toBe(true);
  });

  it('prevents removal for MakeArray at minPins of 1', () => {
    const config = DYNAMIC_PIN_CLASSES.get('K2Node_MakeArray')!;
    const existing = [
      makePin({ direction: 'input', category: 'wildcard' }),
    ];
    expect(canRemovePin(existing, config)).toBe(false);
  });
});
