/**
 * Dynamic pin support — nodes that can add/remove pins at runtime.
 */
import type { PinCategory } from '../types/pin-types';
import type { UEPin } from '../types/ue-graph';

export interface DynamicPinConfig {
  direction: 'input' | 'output';
  namePattern: string; // e.g., "Then {n}" or "Element {n}"
  category: PinCategory;
  subCategoryObject?: string;
  minPins?: number; // Minimum number of dynamic pins (can't go below this)
}

/** Map of node classes to their dynamic pin configurations. */
export const DYNAMIC_PIN_CLASSES: Map<string, DynamicPinConfig> = new Map([
  ['K2Node_ExecutionSequence', {
    direction: 'output',
    namePattern: 'Then {n}',
    category: 'exec',
    minPins: 2,
  }],
  ['K2Node_MakeArray', {
    direction: 'input',
    namePattern: '[{n}]',
    category: 'wildcard',
    minPins: 1,
  }],
  ['K2Node_Select', {
    direction: 'input',
    namePattern: 'Option {n}',
    category: 'wildcard',
    minPins: 2,
  }],
  ['K2Node_CommutativeAssociativeBinaryOperator', {
    direction: 'input',
    namePattern: '{n}',
    category: 'real',
    minPins: 2,
  }],
  ['K2Node_SwitchInteger', {
    direction: 'output',
    namePattern: '{n}',
    category: 'exec',
    minPins: 1,
  }],
]);

/** Generate a 32-char uppercase hex GUID. */
function generateGuid(): string {
  const hex = '0123456789ABCDEF';
  let guid = '';
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)];
  return guid;
}

/** Generate the next dynamic pin for a node. */
export function generateNextPin(
  existingPins: UEPin[],
  config: DynamicPinConfig,
): UEPin {
  // Count existing dynamic pins (pins matching the pattern direction and category)
  const dynamicPins = existingPins.filter((p) =>
    p.direction === config.direction && !p.hidden,
  );
  const nextIndex = dynamicPins.length;
  const name = config.namePattern.replace('{n}', String(nextIndex));

  return {
    id: generateGuid(),
    name,
    friendlyName: name,
    direction: config.direction,
    category: config.category,
    subCategory: '',
    subCategoryObject: config.subCategoryObject ?? '',
    containerType: '',
    defaultValue: '',
    isReference: false,
    isConst: false,
    isWeak: false,
    hidden: false,
    advancedView: false,
  };
}

/** Check if a pin can be removed (respects minPins). */
export function canRemovePin(
  existingPins: UEPin[],
  config: DynamicPinConfig,
): boolean {
  const dynamicPins = existingPins.filter((p) =>
    p.direction === config.direction && !p.hidden,
  );
  return dynamicPins.length > (config.minPins ?? 1);
}
