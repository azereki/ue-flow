/**
 * Struct registry — pre-populated with common UE structs for Break/Make node generation.
 */
import type { PinCategory } from '../types/pin-types';

export interface StructField {
  name: string;
  category: PinCategory;
  subCategoryObject?: string;
}

export interface StructDef {
  path: string;
  fields: StructField[];
}

const STRUCT_REGISTRY: Map<string, StructDef> = new Map([
  ['FVector', {
    path: '/Script/CoreUObject.Vector',
    fields: [
      { name: 'X', category: 'real' },
      { name: 'Y', category: 'real' },
      { name: 'Z', category: 'real' },
    ],
  }],
  ['FRotator', {
    path: '/Script/CoreUObject.Rotator',
    fields: [
      { name: 'Pitch', category: 'real' },
      { name: 'Yaw', category: 'real' },
      { name: 'Roll', category: 'real' },
    ],
  }],
  ['FTransform', {
    path: '/Script/CoreUObject.Transform',
    fields: [
      { name: 'Location', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
      { name: 'Rotation', category: 'struct', subCategoryObject: '/Script/CoreUObject.Rotator' },
      { name: 'Scale', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
    ],
  }],
  ['FLinearColor', {
    path: '/Script/CoreUObject.LinearColor',
    fields: [
      { name: 'R', category: 'real' },
      { name: 'G', category: 'real' },
      { name: 'B', category: 'real' },
      { name: 'A', category: 'real' },
    ],
  }],
  ['FVector2D', {
    path: '/Script/CoreUObject.Vector2D',
    fields: [
      { name: 'X', category: 'real' },
      { name: 'Y', category: 'real' },
    ],
  }],
  ['FHitResult', {
    path: '/Script/Engine.HitResult',
    fields: [
      { name: 'Location', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
      { name: 'ImpactPoint', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
      { name: 'ImpactNormal', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
      { name: 'Normal', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
      { name: 'Distance', category: 'real' },
      { name: 'bBlockingHit', category: 'bool' },
      { name: 'bStartPenetrating', category: 'bool' },
      { name: 'PhysMaterial', category: 'object' },
      { name: 'Component', category: 'object' },
      { name: 'BoneName', category: 'name' },
    ],
  }],
  ['FTimerHandle', {
    path: '/Script/Engine.TimerHandle',
    fields: [
      { name: 'Handle', category: 'int' },
    ],
  }],
  ['FKey', {
    path: '/Script/InputCore.Key',
    fields: [
      { name: 'KeyName', category: 'name' },
    ],
  }],
  ['FGameplayTag', {
    path: '/Script/GameplayTags.GameplayTag',
    fields: [
      { name: 'TagName', category: 'name' },
    ],
  }],
  ['FGameplayTagContainer', {
    path: '/Script/GameplayTags.GameplayTagContainer',
    fields: [
      { name: 'GameplayTags', category: 'struct', subCategoryObject: '/Script/GameplayTags.GameplayTag' },
    ],
  }],
  ['FColor', {
    path: '/Script/CoreUObject.Color',
    fields: [
      { name: 'R', category: 'byte' },
      { name: 'G', category: 'byte' },
      { name: 'B', category: 'byte' },
      { name: 'A', category: 'byte' },
    ],
  }],
  ['FLatentActionInfo', {
    path: '/Script/Engine.LatentActionInfo',
    fields: [
      { name: 'Linkage', category: 'int' },
      { name: 'UUID', category: 'int' },
      { name: 'ExecutionFunction', category: 'name' },
      { name: 'CallbackTarget', category: 'object' },
    ],
  }],
  ['FVector4', {
    path: '/Script/CoreUObject.Vector4',
    fields: [
      { name: 'X', category: 'real' },
      { name: 'Y', category: 'real' },
      { name: 'Z', category: 'real' },
      { name: 'W', category: 'real' },
    ],
  }],
  ['FQuat', {
    path: '/Script/CoreUObject.Quat',
    fields: [
      { name: 'X', category: 'real' },
      { name: 'Y', category: 'real' },
      { name: 'Z', category: 'real' },
      { name: 'W', category: 'real' },
    ],
  }],
  ['FIntPoint', {
    path: '/Script/CoreUObject.IntPoint',
    fields: [
      { name: 'X', category: 'int' },
      { name: 'Y', category: 'int' },
    ],
  }],
  ['FIntVector', {
    path: '/Script/CoreUObject.IntVector',
    fields: [
      { name: 'X', category: 'int' },
      { name: 'Y', category: 'int' },
      { name: 'Z', category: 'int' },
    ],
  }],
  ['FDateTime', {
    path: '/Script/CoreUObject.DateTime',
    fields: [
      { name: 'date', category: 'int64' },
    ],
  }],
  ['FTimespan', {
    path: '/Script/CoreUObject.Timespan',
    fields: [
      { name: 'ticks', category: 'int64' },
    ],
  }],
  ['FGuid', {
    path: '/Script/CoreUObject.Guid',
    fields: [
      { name: 'A', category: 'int' },
      { name: 'B', category: 'int' },
      { name: 'C', category: 'int' },
      { name: 'D', category: 'int' },
    ],
  }],
  ['FSoftObjectPath', {
    path: '/Script/CoreUObject.SoftObjectPath',
    fields: [
      { name: 'AssetPathName', category: 'string' },
      { name: 'SubPathString', category: 'string' },
    ],
  }],
  ['FSoftClassPath', {
    path: '/Script/CoreUObject.SoftClassPath',
    fields: [
      { name: 'AssetPathName', category: 'string' },
      { name: 'SubPathString', category: 'string' },
    ],
  }],
  ['FPrimaryAssetId', {
    path: '/Script/Engine.PrimaryAssetId',
    fields: [
      { name: 'PrimaryAssetType', category: 'name' },
      { name: 'PrimaryAssetName', category: 'name' },
    ],
  }],
  ['FInputActionValue', {
    path: '/Script/EnhancedInput.InputActionValue',
    fields: [
      { name: 'Value', category: 'struct' },
    ],
  }],
]);

/** Get the fields for a registered struct. */
export function getStructFields(structName: string): StructField[] {
  // Try direct name lookup (FVector, FRotator, etc.)
  const def = STRUCT_REGISTRY.get(structName);
  if (def) return def.fields;

  // Try with F prefix
  const withF = STRUCT_REGISTRY.get(`F${structName}`);
  if (withF) return withF.fields;

  // Try path-based lookup
  for (const [, entry] of STRUCT_REGISTRY) {
    if (entry.path === structName) return entry.fields;
    // Match last segment of path (e.g., 'Vector' matches '/Script/CoreUObject.Vector')
    const lastDot = entry.path.lastIndexOf('.');
    if (lastDot >= 0 && entry.path.slice(lastDot + 1) === structName) return entry.fields;
  }

  return [];
}

/** Get all registered struct names. */
export function getRegisteredStructs(): string[] {
  return Array.from(STRUCT_REGISTRY.keys());
}

/** Get the full path for a struct name. */
export function getStructPath(structName: string): string | undefined {
  const def = STRUCT_REGISTRY.get(structName);
  return def?.path;
}
