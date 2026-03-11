# Connection Type System

ue-flow validates pin connections using a multi-layered type compatibility system that mirrors UE's own connection rules. The `canConnect()` function in `connection-validator.ts` is the single validation entry point.

## Validation Pipeline

When a user drags a wire from one pin to another, the following checks run in order:

1. **Direction check** — output must connect to input (or vice versa)
2. **Category compatibility** — pin types must be compatible (see below)
3. **Enum type matching** — enum pins must share the same enum type
4. **Struct type matching** — struct pins must share the same struct type
5. **Self-connection check** — source and target cannot be the same node
6. **Duplicate edge check** — the exact connection must not already exist
7. **Data input auto-replace** — data input pins auto-replace existing connections (returns `replaces` field)
8. **Exec output auto-replace** — exec output pins auto-replace existing connections (returns `replaces` field)
9. **Exec input convergence** — exec input pins allow multiple incoming connections (flow convergence)

## Category Compatibility

### Exact match

Most pin categories require an exact match between source and target:

| Category | Example |
|----------|---------|
| `exec` | Execution flow |
| `bool` | Boolean values |
| `int` | Integer values |
| `real` / `float` / `double` | Floating-point values |
| `int64` | 64-bit integer values |
| `string` | String values |
| `object` | UObject references |
| `struct` | Struct instances |

### Built-in aliases

These categories are treated as identical:

- **`float` ↔ `real` ↔ `double`** — UE uses all three names for floating-point types; they are fully interchangeable

### Wildcard

The `wildcard` category matches any other category. Used by nodes like `K2Node_MakeArray` and `K2Node_Select` whose pin types adapt to their connections.

#### Wildcard Type Locking

When a concrete type connects to a wildcard pin, all sibling wildcard pins on the same node are **locked** to the resolved type via `resolvedCategory` and `resolvedSubCategoryObject` fields on the pin data. The `effectiveCategory()` function returns the resolved type for locked wildcards, or `wildcard` for unlocked ones.

| Scenario | Behavior |
|----------|----------|
| Connect `float` to wildcard element pin on MakeArray | All element pins lock to `float`; connecting `string` is rejected |
| Disconnect the last concrete wire | All sibling wildcards clear back to `wildcard` |
| Two unresolved wildcards connected | Both remain `wildcard` until a concrete type resolves one |

Affected node types: `K2Node_MakeArray`, `K2Node_Select`, `K2Node_ForEachLoop`, reroute nodes.

## Implicit Type Conversions

Beyond exact matches, the system supports implicit promotions matching UE's type coercion rules:

### Numeric promotions

| From | To | Direction |
|------|----|-----------|
| `int` | `real` | Widening |
| `int` | `float` | Widening |
| `int` | `int64` | Widening |
| `int` | `double` | Widening |
| `int64` | `real` | Widening |
| `int64` | `float` | Widening |
| `int64` | `double` | Widening |
| `byte` | `int` | Widening |
| `byte` | `int64` | Widening |
| `byte` | `real` | Widening |
| `byte` | `float` | Widening |
| `byte` | `double` | Widening |
| `float` | `real` | Alias |
| `float` | `double` | Widening |
| `double` | `real` | Alias |
| `double` | `float` | Alias |

### String promotions

| From | To | Description |
|------|----|-------------|
| `name` | `string` | FName → FString |
| `text` | `string` | FText → FString |

### Object hierarchy

Object pins with `subCategoryObject` paths are checked against a built-in class hierarchy:

```
Object
├── Actor
│   ├── Pawn
│   │   └── Character
│   ├── Controller
│   │   └── PlayerController
│   ├── GameModeBase
│   │   └── GameMode
│   ├── PlayerState
│   ├── GameStateBase
│   │   └── GameState
│   └── Info
│       └── PlayerState
├── ActorComponent
│   ├── SceneComponent
│   │   └── PrimitiveComponent
│   │       └── StaticMeshComponent
│   └── MovementComponent
│       └── CharacterMovementComponent
└── Widget
    └── UserWidget
```

A child class object pin can connect to a parent class object pin (e.g., `Character` output → `Actor` input), but not the reverse. The hierarchy check strips path prefixes and handles both short names (`Character`) and full paths (`/Script/Engine.Character`).

### Bidirectional conversion

Implicit conversions are checked in **both directions**. If `canImplicitlyConvert(A→B)` or `canImplicitlyConvert(B→A)` returns true, the connection is allowed. This handles cases where the output is the narrower type connecting to a wider input, regardless of which pin is source vs. target.

## Enum Type Validation

Enum pins require additional validation beyond category matching:

### Enum categories

Two pin categories can represent enum values:
- `enum` — standard enum pins
- `byte` with non-empty `subCategoryObject` — "enum byte" pins (UE's underlying representation)

### Matching rule

When both pins are enum-typed (either `enum` or enum-byte), their `subCategoryObject` must match:

```ts
// Valid: same enum type
Pin A: { category: 'enum', subCategoryObject: 'EMovementMode' }
Pin B: { category: 'enum', subCategoryObject: 'EMovementMode' }
// → Compatible ✓

// Invalid: different enum types
Pin A: { category: 'enum', subCategoryObject: 'EMovementMode' }
Pin B: { category: 'enum', subCategoryObject: 'ECollisionChannel' }
// → Incompatible ✗ — "Incompatible enum types"
```

### Registered enums

The enum registry (`enum-registry.ts`) pre-populates values for common UE enums, used for dropdown editors in pin value editing:

| Enum | Values |
|------|--------|
| `EMovementMode` | MOVE_None, MOVE_Walking, MOVE_NavWalking, MOVE_Falling, MOVE_Swimming, MOVE_Flying, MOVE_Custom |
| `ECollisionChannel` | ECC_WorldStatic, ECC_WorldDynamic, ECC_Pawn, ECC_Visibility, ECC_Camera, ECC_PhysicsBody, ECC_Vehicle, ECC_Destructible |
| `EInputEvent` | IE_Pressed, IE_Released, IE_Repeat, IE_DoubleClick, IE_Axis |
| `EBlendMode` | BLEND_Opaque, BLEND_Masked, BLEND_Translucent, BLEND_Additive, BLEND_Modulate |
| `ETraceTypeQuery` | TraceTypeQuery1-6 |
| `EObjectTypeQuery` | ObjectTypeQuery1-6 |
| `ENetRole` | ROLE_None, ROLE_SimulatedProxy, ROLE_AutonomousProxy, ROLE_Authority |
| `ETextCommit` | Default, OnEnter, OnUserMovedFocus, OnCleared |
| `EAttachmentRule` | KeepRelative, KeepWorld, SnapToTarget |
| `ESpawnActorCollisionHandlingMethod` | Undefined, AlwaysSpawn, AdjustIfPossibleButAlwaysSpawn, AdjustIfPossibleButDontSpawnIfColliding, DontSpawnIfColliding |
| `ECollisionEnabled` | NoCollision, QueryOnly, PhysicsOnly, QueryAndPhysics |
| `ESlateVisibility` | Visible, Collapsed, Hidden, HitTestInvisible, SelfHitTestInvisible |
| `EComponentMobility` | Static, Stationary, Movable |
| `EEndPlayReason` | Destroyed, LevelTransition, EndPlayInEditor, RemovedFromWorld, Quit |
| `EAnimationMode` | AnimationBlueprint, AnimationSingleNode, AnimationCustomMode |
| And 8+ more | See `enum-registry.ts` for full list |

## Struct Type Validation

Struct pins require additional validation beyond category matching:

### Matching rule

When both pins have category `struct` and both have a non-empty `subCategoryObject`, the paths must match exactly:

```ts
// Valid: same struct type
Pin A: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' }
Pin B: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' }
// → Compatible ✓

// Invalid: different struct types
Pin A: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' }
Pin B: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Rotator' }
// → Incompatible ✗ — "Incompatible struct types"

// Valid: one pin has no subCategoryObject (generic struct)
Pin A: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' }
Pin B: { category: 'struct', subCategoryObject: '' }
// → Compatible ✓ (unspecified struct accepts any)
```

## Data Input Auto-Replacement

Data input pins (all non-exec categories) allow only one incoming connection, matching UE editor behavior. When creating a new edge to a data input that already has an incoming connection:

1. `canConnect()` returns `valid: true` with the existing edge in the `replaces` field
2. `addEdge()` automatically removes the existing connection before creating the new one
3. The replacement is captured as part of the same undo snapshot

This means dragging a new data wire to an input pin that is already connected will seamlessly replace the old connection.

## Exec Input Convergence

Unlike data inputs (single connection) and exec outputs (single connection with auto-replace), exec **input** pins accept **multiple incoming connections**. This enables flow convergence — a fundamental Blueprint pattern where multiple execution paths merge into a single node:

```
Branch
├── True  ──→ Print String (exec input)
└── False ──→ Print String (same exec input)
```

Both True and False can connect to the same exec input, allowing cleanup or continuation logic after conditional branches.

## Key Files

| File | Purpose |
|------|---------|
| `js/src/api/connection-validator.ts` | `canConnect()` — single validation entry point |
| `js/src/utils/type-conversions.ts` | `canImplicitlyConvert()`, `TYPE_PROMOTIONS`, `OBJECT_HIERARCHY` |
| `js/src/utils/enum-registry.ts` | `getEnumValues()`, `isEnumByte()`, `getEnumType()` |

## See Also

- [Edge Operations](./GraphAPI-Edge-Operations.md) — `addEdge` and `ConnectionValidation` interface
- [Pin & Property Operations](./GraphAPI-Pin-Property-Operations.md) — enum dropdown editors
- [GraphAPI Overview](./GraphAPI-Overview.md) — architecture
