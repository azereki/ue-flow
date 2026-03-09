/**
 * Implicit type conversion rules for UE Blueprint pin connections.
 *
 * TYPE_PROMOTIONS: directed graph of valid implicit conversions between pin categories.
 * OBJECT_HIERARCHY: class hierarchy for object pin compatibility (subclass → parent).
 */
import type { PinCategory } from '../types/pin-types';

/** Directed graph: key can implicitly convert to all values in the Set. */
export const TYPE_PROMOTIONS: Map<PinCategory, Set<PinCategory>> = new Map([
  ['int', new Set<PinCategory>(['real', 'float', 'int64'])],
  ['byte', new Set<PinCategory>(['int', 'real', 'float'])],
  ['float', new Set<PinCategory>(['real'])],
  ['name', new Set<PinCategory>(['string'])],
  ['text', new Set<PinCategory>(['string'])],
]);

/** Small class hierarchy for common UE classes — child → valid parent classes. */
export const OBJECT_HIERARCHY: Map<string, string[]> = new Map([
  ['Character', ['Pawn', 'Actor', 'Object']],
  ['Pawn', ['Actor', 'Object']],
  ['PlayerController', ['Controller', 'Actor', 'Object']],
  ['AIController', ['Controller', 'Actor', 'Object']],
  ['Controller', ['Actor', 'Object']],
  ['Actor', ['Object']],
  ['ActorComponent', ['Object']],
  ['SceneComponent', ['ActorComponent', 'Object']],
  ['PrimitiveComponent', ['SceneComponent', 'ActorComponent', 'Object']],
  ['StaticMeshComponent', ['PrimitiveComponent', 'SceneComponent', 'ActorComponent', 'Object']],
  ['SkeletalMeshComponent', ['PrimitiveComponent', 'SceneComponent', 'ActorComponent', 'Object']],
  ['CapsuleComponent', ['PrimitiveComponent', 'SceneComponent', 'ActorComponent', 'Object']],
  ['MovementComponent', ['ActorComponent', 'Object']],
  ['CharacterMovementComponent', ['MovementComponent', 'ActorComponent', 'Object']],
  ['Widget', ['Visual', 'Object']],
  ['UserWidget', ['Widget', 'Visual', 'Object']],
  ['GameModeBase', ['Actor', 'Object']],
  ['GameMode', ['GameModeBase', 'Actor', 'Object']],
  ['GameStateBase', ['Actor', 'Object']],
  ['PlayerState', ['Actor', 'Object']],
]);

/** Check if fromCategory can implicitly convert to toCategory. */
export function canImplicitlyConvert(
  fromCat: PinCategory,
  fromSub: string,
  toCat: PinCategory,
  toSub: string,
): boolean {
  // Check primitive promotions
  const promotions = TYPE_PROMOTIONS.get(fromCat);
  if (promotions && promotions.has(toCat)) return true;

  // Check object hierarchy
  if ((fromCat === 'object' || fromCat === 'class') && fromCat === toCat) {
    return isObjectSubclass(fromSub, toSub);
  }

  return false;
}

/** Check if childClass is a subclass of parentClass using the hierarchy. */
export function isObjectSubclass(childClass: string, parentClass: string): boolean {
  if (!childClass || !parentClass) return false;

  // Extract short class names from full paths
  const childShort = childClass.includes('.') ? childClass.split('.').pop()! : childClass;
  const parentShort = parentClass.includes('.') ? parentClass.split('.').pop()! : parentClass;

  if (childShort === parentShort) return true;

  const parents = OBJECT_HIERARCHY.get(childShort);
  if (parents && parents.includes(parentShort)) return true;

  return false;
}
