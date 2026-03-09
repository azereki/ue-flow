# Connection Type System

ue-flow validates pin connections using a multi-layered type compatibility system that mirrors UE's own connection rules. The `canConnect()` function in `connection-validator.ts` is the single validation entry point.

## Validation Pipeline

When a user drags a wire from one pin to another, the following checks run in order:

1. **Direction check** — output must connect to input (or vice versa)
2. **Self-connection check** — source and target cannot be the same node
3. **Duplicate edge check** — the exact connection must not already exist
4. **Exec input limit** — exec input pins allow only one incoming connection
5. **Exec output replacement** — exec output pins auto-replace existing connections (returns `replaces` field)
6. **Category compatibility** — pin types must be compatible (see below)
7. **Enum type matching** — enum pins must share the same enum type

## Category Compatibility

### Exact match

Most pin categories require an exact match between source and target:

| Category | Example |
|----------|---------|
| `exec` | Execution flow |
| `bool` | Boolean values |
| `int` | Integer values |
| `real` / `float` | Floating-point values |
| `string` | String values |
| `object` | UObject references |
| `struct` | Struct instances |

### Built-in aliases

These categories are treated as identical:

- **`float` ↔ `real`** — UE uses both names for the same underlying type

### Wildcard

The `wildcard` category matches any other category. Used by nodes like `K2Node_MakeArray` and `K2Node_Select` whose pin types adapt to their connections.

## Implicit Type Conversions

Beyond exact matches, the system supports implicit promotions matching UE's type coercion rules:

### Numeric promotions

| From | To | Direction |
|------|----|-----------|
| `int` | `real` | Widening |
| `int` | `float` | Widening |
| `int` | `int64` | Widening |
| `byte` | `int` | Widening |
| `byte` | `real` | Widening |
| `byte` | `float` | Widening |
| `float` | `real` | Alias |

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
