/**
 * Enum registry — pre-populated with common UE enums for validation.
 * Used by connection-validator to enforce enum type matching.
 */
import type { UEPin } from '../types/ue-graph';

export interface EnumDef {
  path: string;
  values: string[];
}

const ENUM_REGISTRY: Map<string, EnumDef> = new Map([
  ['EMovementMode', {
    path: '/Script/Engine.EMovementMode',
    values: ['MOVE_None', 'MOVE_Walking', 'MOVE_NavWalking', 'MOVE_Falling', 'MOVE_Swimming', 'MOVE_Flying', 'MOVE_Custom'],
  }],
  ['ECollisionChannel', {
    path: '/Script/Engine.ECollisionChannel',
    values: ['ECC_WorldStatic', 'ECC_WorldDynamic', 'ECC_Pawn', 'ECC_Visibility', 'ECC_Camera', 'ECC_PhysicsBody', 'ECC_Vehicle', 'ECC_Destructible'],
  }],
  ['EInputEvent', {
    path: '/Script/Engine.EInputEvent',
    values: ['IE_Pressed', 'IE_Released', 'IE_Repeat', 'IE_DoubleClick', 'IE_Axis'],
  }],
  ['EBlendMode', {
    path: '/Script/Engine.EBlendMode',
    values: ['BLEND_Opaque', 'BLEND_Masked', 'BLEND_Translucent', 'BLEND_Additive', 'BLEND_Modulate', 'BLEND_AlphaComposite', 'BLEND_AlphaHoldout'],
  }],
  ['ETraceTypeQuery', {
    path: '/Script/Engine.ETraceTypeQuery',
    values: ['TraceTypeQuery1', 'TraceTypeQuery2', 'TraceTypeQuery3', 'TraceTypeQuery4', 'TraceTypeQuery5', 'TraceTypeQuery6'],
  }],
  ['EObjectTypeQuery', {
    path: '/Script/Engine.EObjectTypeQuery',
    values: ['ObjectTypeQuery1', 'ObjectTypeQuery2', 'ObjectTypeQuery3', 'ObjectTypeQuery4', 'ObjectTypeQuery5', 'ObjectTypeQuery6'],
  }],
  ['ENetRole', {
    path: '/Script/Engine.ENetRole',
    values: ['ROLE_None', 'ROLE_SimulatedProxy', 'ROLE_AutonomousProxy', 'ROLE_Authority', 'ROLE_MAX'],
  }],
  ['ETextCommit', {
    path: '/Script/SlateCore.ETextCommit',
    values: ['Default', 'OnEnter', 'OnUserMovedFocus', 'OnCleared'],
  }],
  // Collision & Physics
  ['EAttachmentRule', {
    path: '/Script/Engine.EAttachmentRule',
    values: ['KeepRelative', 'KeepWorld', 'SnapToTarget'],
  }],
  ['ESpawnActorCollisionHandlingMethod', {
    path: '/Script/Engine.ESpawnActorCollisionHandlingMethod',
    values: ['Undefined', 'AlwaysSpawn', 'AdjustIfPossibleButAlwaysSpawn', 'AdjustIfPossibleButDontSpawnIfColliding', 'DontSpawnIfColliding'],
  }],
  ['ECollisionEnabled', {
    path: '/Script/Engine.ECollisionEnabled',
    values: ['NoCollision', 'QueryOnly', 'PhysicsOnly', 'QueryAndPhysics', 'ProbeOnly', 'QueryAndProbe'],
  }],
  ['ECollisionResponse', {
    path: '/Script/Engine.ECollisionResponse',
    values: ['Block', 'Overlap', 'Ignore'],
  }],
  // UI & Rendering
  ['ESlateVisibility', {
    path: '/Script/SlateCore.ESlateVisibility',
    values: ['Visible', 'Collapsed', 'Hidden', 'HitTestInvisible', 'SelfHitTestInvisible'],
  }],
  ['EComponentMobility', {
    path: '/Script/Engine.EComponentMobility',
    values: ['Static', 'Stationary', 'Movable'],
  }],
  ['EHorizontalAlignment', {
    path: '/Script/SlateCore.EHorizontalAlignment',
    values: ['Fill', 'Left', 'Center', 'Right'],
  }],
  ['EVerticalAlignment', {
    path: '/Script/SlateCore.EVerticalAlignment',
    values: ['Fill', 'Top', 'Center', 'Bottom'],
  }],
  // Gameplay
  ['EEndPlayReason', {
    path: '/Script/Engine.EEndPlayReason',
    values: ['Destroyed', 'LevelTransition', 'EndPlayInEditor', 'RemovedFromWorld', 'Quit'],
  }],
  ['EAnimationMode', {
    path: '/Script/Engine.EAnimationMode',
    values: ['AnimationBlueprint', 'AnimationSingleNode', 'AnimationCustomMode'],
  }],
  ['ENetMode', {
    path: '/Script/Engine.ENetMode',
    values: ['Standalone', 'DedicatedServer', 'ListenServer', 'Client', 'MAX'],
  }],
  // Math & Navigation
  ['EAxis', {
    path: '/Script/Engine.EAxis',
    values: ['None', 'X', 'Y', 'Z'],
  }],
  ['ERelativeTransformSpace', {
    path: '/Script/Engine.ERelativeTransformSpace',
    values: ['World', 'LocalSpace', 'ParentBoneSpace'],
  }],
  ['EPathFollowingResult', {
    path: '/Script/AIModule.EPathFollowingResult',
    values: ['Success', 'Blocked', 'OffPath', 'Aborted', 'Skipped', 'Invalid'],
  }],
  // Audio
  ['EAudioFaderCurve', {
    path: '/Script/Engine.EAudioFaderCurve',
    values: ['Linear', 'Logarithmic', 'SCurve', 'Sin'],
  }],
  ['ESoundDistanceModel', {
    path: '/Script/Engine.ESoundDistanceModel',
    values: ['Linear', 'Logarithmic', 'Inverse', 'LogReverse', 'NaturalSound', 'Custom'],
  }],
]);

/** Get the values for a registered enum. */
export function getEnumValues(enumName: string): string[] {
  // Try direct name lookup
  const def = ENUM_REGISTRY.get(enumName);
  if (def) return def.values;

  // Try path-based lookup
  for (const [, entry] of ENUM_REGISTRY) {
    if (entry.path === enumName) return entry.values;
  }

  return [];
}

/** Check if a pin represents an enum byte (category 'byte' with non-empty subCategoryObject). */
export function isEnumByte(pin: UEPin): boolean {
  return pin.category === 'byte' && !!pin.subCategoryObject;
}

/** Get the enum type identifier from a pin. */
export function getEnumType(pin: UEPin): string {
  if (pin.category === 'enum') return pin.subCategoryObject || '';
  if (isEnumByte(pin)) return pin.subCategoryObject;
  return '';
}

/** Get all registered enum names. */
export function getRegisteredEnums(): string[] {
  return Array.from(ENUM_REGISTRY.keys());
}
