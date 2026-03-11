/**
 * Connection validation — determines whether two pins can be connected.
 *
 * Used by the isValidConnection callback on ReactFlow and by GraphAPI.addEdge().
 */
import type { UEPin } from '../types/ue-graph';
import type { PinCategory } from '../types/pin-types';
import { canImplicitlyConvert } from '../utils/type-conversions';
import { isEnumByte } from '../utils/enum-registry';

export interface ConnectionValidation {
  valid: boolean;
  reason?: string;
  /** If set, this existing edge should be replaced by the new connection (exec output auto-replace). */
  replaces?: { source: string; sourceHandle?: string; target: string; targetHandle?: string };
}

/** Pin categories that are compatible with each other (float↔real aliases). */
const COMPATIBLE_CATEGORIES: Record<string, Set<string>> = {
  real: new Set(['real', 'float', 'double']),
  float: new Set(['float', 'real', 'double']),
  double: new Set(['double', 'real', 'float']),
};

/**
 * Get the effective category for a pin, using resolvedCategory if the pin is
 * a wildcard that has been locked by a prior connection.
 */
export function effectiveCategory(pin: UEPin): { category: PinCategory; subCategoryObject: string } {
  if (pin.category === 'wildcard' && pin.resolvedCategory) {
    return {
      category: pin.resolvedCategory as PinCategory,
      subCategoryObject: pin.resolvedSubCategoryObject ?? pin.subCategoryObject,
    };
  }
  return { category: pin.category, subCategoryObject: pin.subCategoryObject };
}

/** Check if two pin categories are compatible for connection. */
function categoriesCompatible(a: PinCategory, b: PinCategory, aSub?: string, bSub?: string): boolean {
  // Wildcard matches anything
  if (a === 'wildcard' || b === 'wildcard') return true;

  // Exact match
  if (a === b) return true;

  // Check compatibility aliases
  const compatA = COMPATIBLE_CATEGORIES[a];
  if (compatA && compatA.has(b)) return true;

  // Check implicit type promotions (int→real, byte→int, name→string, etc.)
  if (canImplicitlyConvert(a, aSub ?? '', b, bSub ?? '')) return true;
  if (canImplicitlyConvert(b, bSub ?? '', a, aSub ?? '')) return true;

  return false;
}

/**
 * Validate whether a connection between two pins is allowed.
 *
 * Rules:
 * - Pins must have opposite directions (output → input)
 * - Pin categories must be compatible (float↔real↔double aliases, implicit promotions)
 * - Enum pins must share the same enum type (subCategoryObject match)
 * - Struct pins must share the same struct type (subCategoryObject match)
 * - No self-connections (same node)
 * - No duplicate edges
 * - Data input pins auto-replace their existing connection (UE behavior)
 * - Exec output pins auto-replace their existing connection (UE behavior)
 * - Exec input pins allow multiple incoming connections (flow convergence)
 */
export function canConnect(
  sourcePin: UEPin,
  targetPin: UEPin,
  sourceNodeId: string,
  targetNodeId: string,
  existingEdges?: Array<{ source: string; sourceHandle?: string; target: string; targetHandle?: string }>,
): ConnectionValidation {
  // Opposite directions
  if (sourcePin.direction === targetPin.direction) {
    return { valid: false, reason: 'Cannot connect pins with same direction' };
  }

  // Ensure source is output and target is input
  const outPin = sourcePin.direction === 'output' ? sourcePin : targetPin;
  const inPin = sourcePin.direction === 'input' ? sourcePin : targetPin;

  // Resolve effective categories for wildcard pins that have been locked
  const outEff = effectiveCategory(outPin);
  const inEff = effectiveCategory(inPin);

  // Category compatibility (use resolved types for locked wildcards)
  if (!categoriesCompatible(outEff.category, inEff.category, outEff.subCategoryObject, inEff.subCategoryObject)) {
    return { valid: false, reason: `Incompatible types: ${outEff.category} → ${inEff.category}` };
  }

  // Enum pins: must share the same enum type
  if ((outPin.category === 'enum' || isEnumByte(outPin)) &&
      (inPin.category === 'enum' || isEnumByte(inPin))) {
    if (outPin.subCategoryObject && inPin.subCategoryObject &&
        outPin.subCategoryObject !== inPin.subCategoryObject) {
      return { valid: false, reason: `Incompatible enum types: ${outPin.subCategoryObject} vs ${inPin.subCategoryObject}` };
    }
  }

  // Struct pins: must share the same struct type
  if (outPin.category === 'struct' && inPin.category === 'struct') {
    if (outPin.subCategoryObject && inPin.subCategoryObject &&
        outPin.subCategoryObject !== inPin.subCategoryObject) {
      return { valid: false, reason: `Incompatible struct types: ${outPin.subCategoryObject} vs ${inPin.subCategoryObject}` };
    }
  }

  // No self-connections
  if (sourceNodeId === targetNodeId) {
    return { valid: false, reason: 'Cannot connect a node to itself' };
  }

  // No duplicate edges
  if (existingEdges) {
    const isDuplicate = existingEdges.some((e) =>
      (e.source === sourceNodeId && e.sourceHandle === sourcePin.id &&
       e.target === targetNodeId && e.targetHandle === targetPin.id) ||
      (e.source === targetNodeId && e.sourceHandle === targetPin.id &&
       e.target === sourceNodeId && e.targetHandle === sourcePin.id),
    );
    if (isDuplicate) {
      return { valid: false, reason: 'Connection already exists' };
    }
  }

  // Data input pins: replace existing connection (UE auto-disconnects old wire)
  if (inPin.category !== 'exec' && existingEdges) {
    const realTargetId = sourcePin.direction === 'input' ? sourceNodeId : targetNodeId;
    const realTargetHandle = inPin.id;
    const existingDataIn = existingEdges.find((e) =>
      e.target === realTargetId && e.targetHandle === realTargetHandle,
    );
    if (existingDataIn) {
      return { valid: true, replaces: existingDataIn };
    }
  }

  // Exec outputs: replace existing connection (UE auto-disconnects old wire)
  if (outPin.category === 'exec' && existingEdges) {
    const realSourceId = sourcePin.direction === 'output' ? sourceNodeId : targetNodeId;
    const realSourceHandle = outPin.id;
    const existingExecOut = existingEdges.find((e) =>
      e.source === realSourceId && e.sourceHandle === realSourceHandle,
    );
    if (existingExecOut) {
      return { valid: true, replaces: existingExecOut };
    }
  }

  return { valid: true };
}
