# Unreal Engine Blueprints — Comprehensive AI Context Reference

> This document provides deep context about what UE Blueprints ARE, how they work, and expected in-engine user workflows. It serves as grounding context for AI-assisted development of ue-flow.

---

## Table of Contents

1. [What Blueprints Are](#1-what-blueprints-are)
2. [Blueprint Class Types](#2-blueprint-class-types)
3. [The Execution Model](#3-the-execution-model)
4. [Graph Types](#4-graph-types)
5. [Node Categories & UE Classes](#5-node-categories--ue-classes)
6. [Pins, Data Types & Colors](#6-pins-data-types--colors)
7. [Connection Rules](#7-connection-rules)
8. [Variables & Scoping](#8-variables--scoping)
9. [Container Types](#9-container-types)
10. [Events System](#10-events-system)
11. [Functions](#11-functions)
12. [Macros vs Functions](#12-macros-vs-functions)
13. [Blueprint Interfaces](#13-blueprint-interfaces)
14. [Blueprint Communication Patterns](#14-blueprint-communication-patterns)
15. [Timelines](#15-timelines)
16. [Components](#16-components)
17. [Graph Editor UX & Interaction](#17-graph-editor-ux--interaction)
18. [Best Practices](#18-best-practices)
19. [C++ ↔ Blueprint Relationship](#19-c--blueprint-relationship)
20. [T3D Serialization Format](#20-t3d-serialization-format)
21. [Implications for ue-flow](#21-implications-for-ue-flow)

---

## 1. What Blueprints Are

**Blueprints Visual Scripting** is a complete visual programming system in Unreal Engine that uses a **node-based interface** to create gameplay elements from within Unreal Editor. Rather than writing text-based code, developers connect visual nodes with wires on a 2D graph canvas.

**Key characteristics:**
- **Visual and node-based:** Each operation is a rectangular node with typed input/output pins, connected by colored wires to form executable logic graphs
- **Object-oriented:** Blueprints define OO classes. A compiled Blueprint produces a `UBlueprintGeneratedClass` — a full UClass treated identically to C++ classes at runtime
- **Successor to Kismet:** Replaced UE3's Kismet visual scripting and UnrealScript (.uc files) as the primary non-C++ scripting system
- **Saved as assets:** Blueprint assets are `.uasset` content packages, not source code files
- **Complete scripting system:** Can extend classes, store/modify properties, manage components, define variables, implement functions, respond to events, and handle virtually all gameplay logic

**Comparison to prior systems:**

| Concept | UnrealScript (UE3) | Blueprints (UE4/5) | C++ (UE4/5) |
|---|---|---|---|
| Source file | .uc file | Blueprint Asset (.uasset) | .h/.cpp files |
| Class type | UClass | UBlueprintGeneratedClass | UClass |
| Inheritance | `extends [ClassName]` | ParentClass | `: [ClassName]` |
| Properties | Variable | Variable | `UPROPERTY()` |
| Logic | Function | Graphs/Events | `UFUNCTION()` |
| Defaults | `defaultproperties{}` | Class Defaults | Native constructor |

---

## 2. Blueprint Class Types

### Blueprint Class (most common)
The standard type. Defines a new class/Actor that can be placed into maps as instances. Contains components, graphs, variables, and functions.

### Data-Only Blueprint
Contains **only** inherited code, variables, and components from its parent — no new elements. Replacement for UE3 archetypes. Edited in a compact property editor. Can be "converted" to a full Blueprint by adding code/variables/components.

### Level Blueprint
A specialized Blueprint acting as a **level-wide global event graph**. Each level has exactly one. Direct successor to UE3 Kismet. Handles level-wide events, per-actor-instance events, level streaming, and Sequencer binding. Cannot be instanced or subclassed.

### Blueprint Interface
**Function declarations with no implementation** (signatures only). Any implementing Blueprint provides its own implementation. Enables polymorphic communication without casting. Cannot add variables or components.

### Blueprint Macro Library
Collection of **Macros** — self-contained graphs expanded inline during compilation (like C++ inline functions). Not compiled themselves. Shareable across Blueprints.

### Animation Blueprint
Specialized for skeletal mesh animation. Contains AnimGraph (animation-specific nodes) alongside standard EventGraph. Uses `UAnimInstance` base class. Handles state machines, blend spaces, montages.

### Blueprint Utility (Blutility)
**Editor-only** Blueprint for editor actions. Can expose buttons, execute functions, act on selected Actors. Not intended for runtime gameplay.

---

## 3. The Execution Model

### Event-Driven Architecture
Blueprint execution is fundamentally **event-driven**. Nothing runs unless triggered by an event. Events are the entry points into all Blueprint logic.

### Execution Flow (Exec Wires)
White "exec" wires determine **order of execution**:
1. An event node fires, activating its output exec pin
2. Execution follows the white wire to the next node
3. That node executes, then passes execution along its output exec pin
4. Flow continues until reaching a node with no connected output exec pin, or branches via flow control

Exec flow is always **sequential** within a single chain — no parallel execution within one graph tick. Sequence nodes provide "sequential multi-output" but each branch completes before the next starts (within the same frame for non-latent chains).

### Pure vs. Impure Nodes

**Impure nodes** (most common):
- Have exec input and output pins (white arrow pins)
- Execute **once** when the exec wire reaches them
- Can have side effects (modify state, call into the world)
- Examples: `PrintString`, `SetActorLocation`, `SpawnActor`, `Delay`

**Pure nodes:**
- Have **NO exec pins** — only data input/output pins
- Evaluated **every time** their output is read (on-demand, possibly multiple times per frame)
- Must have no side effects (const operations)
- Examples: math operators, comparisons, getters, `GetActorLocation`, vector math
- Some render in compact form with just the operator symbol

**Critical rule:** Pure functions must NEVER have exec pins. Impure functions MUST have exec input/output pins.

### Latent Nodes
Special impure nodes that **pause execution** and resume later:
- Shown with a **clock icon** in the UE editor
- Examples: `Delay`, `MoveTo`, `PlayAnimMontage`, `AIMoveTo`, `LoadStreamLevel`
- Downstream nodes execute only when the latent action completes
- Internally use `FLatentActionInfo` (requiring a hidden `LatentInfo` pin in T3D)
- Multiple latent nodes can be active simultaneously on different exec branches
- Cannot be placed inside regular functions — only in Event Graphs or Macros

### Data Flow
Typed values flow along colored data wires from output pins to input pins. Pure nodes are evaluated lazily when their output is read. Impure node outputs are computed once when the node executes and cached. Data flows can cross exec boundaries.

---

## 4. Graph Types

### EventGraph
- **Purpose:** Primary graph for runtime gameplay logic. Event-driven node networks responding to gameplay triggers
- **When it runs:** At runtime, whenever event nodes fire. Multiple event entry points coexist independently
- **Details:** Every Blueprint Class has one by default. The "main" graph. In T3D, nodes live at the top level

### ConstructionScript
- **Purpose:** Initialization logic running when a Blueprint instance is created or modified in-editor
- **When it runs:** In-editor on place/move/property-change, and at runtime on spawn. Runs *before* BeginPlay
- **Details:** Single entry node (`K2Node_FunctionEntry` with `SignatureName="UserConstructionScript"`). Cannot use latent nodes

### Function Graphs
- **Purpose:** Reusable callable sub-graphs with defined entry (`K2Node_FunctionEntry`) and optional return (`K2Node_FunctionResult`)
- **When it runs:** When explicitly called via `K2Node_CallFunction`
- **Details:** Can be pure or impure. Cannot contain latent nodes. Each function is its own graph tab. In T3D, stored in `FunctionGraphs` block

### Macro Graphs
- **Purpose:** Reusable node patterns expanded inline at compile time. Support multiple exec outputs and timeline nodes
- **When it runs:** Inlined — don't exist as callable units at runtime
- **Details:** UE class `K2Node_MacroInstance`. Use tunnel nodes (`K2Node_Tunnel`) for entry/exit. Standard flow control nodes (ForLoop, ForEachLoop, WhileLoop, DoOnce, FlipFlop, Gate, DoN, MultiGate) are actually macros from `/Engine/EditorBlueprintResources/StandardMacros`

### AnimGraph
- **Purpose:** Animation-specific graphs in Animation Blueprints for skeletal mesh animation
- **When it runs:** Every frame during animation update
- **Details:** Uses `AnimGraphNode_*` node types. Not part of standard K2Node system

---

## 5. Node Categories & UE Classes

### Events
Entry points for execution flow. Red header bar in UE.

| UE Class | Description | Required Properties |
|---|---|---|
| `K2Node_Event` | Engine/parent class event override | `EventReference`, `bOverrideFunction: 'True'` |
| `K2Node_CustomEvent` | User-defined custom event | `CustomFunctionName` |
| `K2Node_InputAction` | Input action event | `InputActionName` |
| `K2Node_InputKey` | Raw key press/release | `InputKey` |
| `K2Node_InputTouch` | Touch input event | Touch type enum |
| `K2Node_ActorBoundEvent` | Event bound to specific actor | `EventReference` + `DelegateOwner` |

Common engine events (all `K2Node_Event`):
- `ReceiveBeginPlay` (parent: `/Script/Engine.Actor`)
- `ReceiveTick` (parent: `/Script/Engine.Actor`)
- `ReceiveActorBeginOverlap`, `ReceiveActorEndOverlap`
- `ReceiveAnyDamage`, `ReceiveHit`
- `ReceiveDestroyed`, `ReceiveEndPlay`

### Functions (K2Node_CallFunction)
The workhorse node. Calls any Blueprint-callable function.

| Property | Description |
|---|---|
| `FunctionReference` | `(MemberParent="/Script/Engine.ClassName",MemberName="FunctionName")` |
| Pure vs Impure | Pure = no exec pins, evaluate on-demand. Impure = exec in/out pins |
| Latent | `bIsLatent: true`. Clock icon. Requires `LatentInfo` hidden pin |
| Compact display | Some pure functions render as small inline nodes with operator symbols |

Key function parent classes:
- `KismetMathLibrary` — math operations, comparisons, conversions
- `KismetSystemLibrary` — PrintString, Delay, IsValid, timers, line traces
- `KismetStringLibrary` — string manipulation
- `GameplayStatics` — GetPlayerController, SpawnActor, play sounds
- `Actor` — K2_DestroyActor, K2_SetActorLocation, K2_GetActorLocation

### Flow Control

| Node | UE Class | Description |
|---|---|---|
| **Branch** | `K2Node_IfThenElse` | If/else. Condition (bool) → True/False exec |
| **Sequence** | `K2Node_ExecutionSequence` | Executes Then 0..N in order. Dynamic pin count |
| **ForLoop** | `K2Node_MacroInstance` | Counted loop (FirstIndex, LastIndex, LoopBody, Completed) |
| **ForEachLoop** | `K2Node_ForEachLoop` | Array iteration |
| **WhileLoop** | `K2Node_MacroInstance` | Condition-based loop |
| **Gate** | `K2Node_Gate` / MacroInstance | Controllable pass-through |
| **DoOnce** | `K2Node_DoOnce` / MacroInstance | Fires once until reset |
| **DoN** | `K2Node_MacroInstance` | Fires N times |
| **FlipFlop** | `K2Node_FlipFlop` | Alternates between A and B |
| **MultiGate** | `K2Node_MultiGate` | Routes to outputs sequentially or randomly |
| **Select** | `K2Node_Select` | Pure data selection by index |
| **Switch on Int** | `K2Node_SwitchInteger` | Integer switch-case |
| **Switch on String** | `K2Node_SwitchString` | String switch-case |
| **Switch on Enum** | `K2Node_SwitchEnum` | Enum switch-case |

### Variables

| UE Class | Description | Required Properties |
|---|---|---|
| `K2Node_VariableGet` | Getter — pure, no exec pins | `VariableReference: '(MemberName="VarName",bSelfContext=True)'` |
| `K2Node_VariableSet` | Setter — impure, has exec pins | Same `VariableReference` format |

Variable getter titles should be the variable name (e.g., `"Health"`), NOT `"Get Health"`.

### Casting

| UE Class | Description |
|---|---|
| `K2Node_DynamicCast` | Cast object to specific class. Pins: Object input, exec in/out, "As [Class]" output, "Cast Failed" exec |
| `K2Node_ClassDynamicCast` | Cast a class reference (operates on UClass*) |

### Math / Operators

| UE Class | Description |
|---|---|
| `K2Node_PromotableOperator` | Type-flexible operators (==, !=, <, >, +, -, *, /). Pure, compact display |
| `K2Node_CommutativeAssociativeBinaryOperator` | Dynamic input pin count (Add, Multiply, AND, OR). Pure, compact |

Both require `FunctionReference` pointing to `KismetMathLibrary`.

### Other Special Nodes

| UE Class | Description |
|---|---|
| `K2Node_Knot` | Reroute node — visual wire organization only |
| `EdGraphNode_Comment` | Comment block overlay. `NodeComment`, `NodeWidth`, `NodeHeight` properties |
| `K2Node_MakeArray` | Constructs array from element pins. Dynamic pin count |
| `K2Node_BreakStruct` | Splits struct into individual member pins |
| `K2Node_MakeStruct` | Constructs struct from member pins |
| `K2Node_SpawnActorFromClass` | Spawns actor at a transform |
| `K2Node_Timeline` | Timeline for interpolation curves |
| `K2Node_FunctionEntry` | Function graph entry point. `SignatureName` property |
| `K2Node_FunctionResult` | Function graph return node |
| `K2Node_MacroInstance` | Macro instance. `MacroGraphReference` property |
| `K2Node_Tunnel` | Entry/exit for collapsed graphs and macros |
| `K2Node_Delay` | Latent delay node |

### Node Properties

- **Pure:** No exec pins. Evaluated each time output is read. `isPure: true` in signature DB
- **Impure:** Has exec in/out pins. Executes once in sequence. Must have exec pins
- **Latent:** Pauses execution, resumes later. `isLatent: true`. Clock icon. Cannot use in functions
- **Compact display:** Pure nodes with `CompactNodeTitle` show just the operator symbol
- **Dynamic pins:** Some nodes support adding/removing pins (Sequence, MakeArray, Select, commutative operators, SwitchInteger)

---

## 6. Pins, Data Types & Colors

### Pin Category Taxonomy

```
'exec' | 'bool' | 'real' | 'float' | 'int' | 'byte'
| 'string' | 'name' | 'text' | 'object' | 'class'
| 'struct' | 'enum' | 'interface' | 'delegate'
| 'softclass' | 'softobject' | 'wildcard'
```

### Base Pin Colors

| Category | Color | Hex | Notes |
|---|---|---|---|
| **Exec** | White | `#FFFFFF` | Control flow only. Rounded arrow shape |
| **Boolean** | Maroon/Dark Red | `#8B0000` | True/false |
| **Byte** | Dark Teal | `#005F5F` | 0-255. Also enum backing type (with `subCategoryObject`) |
| **Integer** | Cyan/Teal | `#00CBCB` | Signed 32-bit |
| **Float/Real** | Light Green | `#00B400` | UE5 uses `real` category; `float` is legacy alias |
| **String** | Magenta | `#FF00FF` | `FString` |
| **Name** | Light Purple/Mauve | `#9E77C4` | `FName` — immutable identifier |
| **Text** | Pink | `#EA8AC3` | `FText` — localizable |
| **Object** | Blue | `#1296C8` | `UObject*` reference. `subCategoryObject` = class path |
| **Class** | Purple | `#6A1EC4` | `TSubclassOf`. `subCategoryObject` = base class |
| **Struct** | Dark Blue | `#005080` | Compound value type. `subCategoryObject` = struct path |
| **Enum** | Dark Cyan | `#00858C` | `subCategoryObject` = enum path |
| **Interface** | Yellow-Green | `#C4B43A` | Interface reference |
| **Delegate** | Red | `#C4443A` | Delegate / multicast delegate |
| **Soft Object** | Blue | `#1296C8` | Soft reference (lazy-loaded) |
| **Soft Class** | Purple | `#6A1EC4` | Soft class reference |
| **Wildcard** | Gray | `#AAAAAA` | Resolves to concrete type on first connection |

### Extended Struct-Subtype Colors

| Sub-Type | Hex | Condition |
|---|---|---|
| **Vector** | `#F8D040` (Gold) | `subCategoryObject` contains `Vector` |
| **Vector2D** | `#D8B838` | `subCategoryObject` contains `Vector2D` |
| **Rotator** | `#8CB4E8` (Cornflower Blue) | `subCategoryObject` contains `Rotator` |
| **Transform** | `#E87830` (Orange) | `subCategoryObject` contains `Transform` |
| **LinearColor** | `#F0C040` | `subCategoryObject` contains `LinearColor` |
| **Int64** | `#1FE3AF` (Moss Green) | `subCategory` is `int64` |
| **Double** | `#A1FF45` | `subCategory` is `double` |

Color resolution order: check `subCategoryObject` short name → `subCategory` → base `PIN_COLORS[category]`.

### Pin Direction
- **Input pins:** Left side of node
- **Output pins:** Right side of node
- Connections always flow from output (right) to input (left)

### Pin Properties
- **PinId:** Internal 32-character uppercase hexadecimal GUID
- **SubCategoryObject:** For object/struct/enum pins, specifies exact type
- **DefaultValue:** Inline editor value when no wire is connected
- **AutogeneratedDefaultValue:** Separately tracked, only emitted in T3D when explicitly set
- **IsHidden:** Some pins exist for serialization but aren't shown (`self`, `WorldContextObject`)
- **ContainerType:** `None` (single value), `Array`, `Set`, `Map`

---

## 7. Connection Rules

### Directionality
- Connections only go from **output** to **input** (never same-direction)
- Self-connections (same node) are **not allowed**
- Duplicate edges (same source pin → same target pin) are **not allowed**

### Exec Pin Rules
- **Exec output:** Only **one** connection per output pin. New wire **auto-replaces** existing
- **Exec input:** **Multiple** connections allowed (convergence)

### Data Pin Rules
- **Data output:** **Multiple** connections allowed (fan-out)
- **Data input:** Only **one** connection per input pin (new replaces existing)
- Unconnected input pins show inline editor for **default values**

### Type Compatibility & Implicit Conversions

| From | To | Notes |
|---|---|---|
| `int` | `real` / `float` | Integer to float promotion |
| `int` | `int64` | Widening |
| `byte` | `int` | Widening |
| `byte` | `real` / `float` | Widening through int |
| `float` | `real` | Alias compatibility (identical in UE5) |
| `name` | `string` | FName to FString |
| `text` | `string` | FText to FString |

Additional compatibility:
- **`real` and `float`** are bidirectional aliases
- **Wildcard** pins match any category
- **Object hierarchy:** Child class outputs connect to parent class inputs (e.g., `Character` → `Actor` → `Object`)
- **Enum matching:** Two enum pins must share the same `subCategoryObject` (enum path)
- **Enum bytes:** `byte` pin with non-empty `subCategoryObject` is treated as enum

### Object Hierarchy (for implicit casting)

```
Character → Pawn → Actor → Object
PlayerController → Controller → Actor → Object
AIController → Controller → Actor → Object
StaticMeshComponent → PrimitiveComponent → SceneComponent → ActorComponent → Object
SkeletalMeshComponent → PrimitiveComponent → SceneComponent → ActorComponent → Object
CharacterMovementComponent → MovementComponent → ActorComponent → Object
UserWidget → Widget → Visual → Object
GameMode → GameModeBase → Actor → Object
```

---

## 8. Variables & Scoping

### Variable Types

| UE Type | C++ Type | Pin Category |
|---|---|---|
| Boolean | `bool` | `bool` |
| Byte | `unsigned char` | `byte` |
| Integer | `int` | `int` |
| Integer64 | `int64` | `int` (subCategory `int64`) |
| Float | `float` | `real` / `float` |
| Name | `FName` | `name` |
| String | `FString` | `string` |
| Text | `FText` | `text` |
| Vector | `FVector` | `struct` (subCategoryObject `Vector`) |
| Rotator | `FRotator` | `struct` (subCategoryObject `Rotator`) |
| Transform | `FTransform` | `struct` (subCategoryObject `Transform`) |
| Object | `UObject*` | `object` |

### Variable Visibility
- **Instance Editable** (public eye icon): editable per-instance in Level Editor Details panel
- **Private:** prevents modification from child/external Blueprints
- **Expose on Spawn:** settable on `SpawnActorFromClass` nodes
- **Expose to Cinematics:** allows Sequencer keyframing
- **Read Only:** only a getter is generated

### Variable Replication
- `replicated: boolean` — whether the variable replicates
- `replicationMode`: `Replicated`, `RepNotify`, `ServerRPC`, `ClientRPC`, `MulticastRPC`

### Local Variables
- Scoped to function graphs only. Destroyed after function returns
- Created in My Blueprint panel when editing a function
- Useful for intermediate calculations, loop counters, cached values
- Class variables persist for object lifetime and are shared across all graphs

---

## 9. Container Types

### Array
- `containerType: 'Array'`
- Same color as element type, with **diamond/grid icon** overlay
- Ordered, allows duplicates, zero-indexed
- Operations: Add, Remove, Get, Set, Find, Contains, Length, ForEach, Sort, Filter

### Set
- `containerType: 'Set'`
- Same color as element type, with set-specific indicator
- Unordered, no duplicates
- Operations: Add, Remove, Contains, Length, Union, Intersection, Difference

### Map
- `containerType: 'Map'`
- Two colors — key type color + value type
- Key-value pairs with unique keys
- `UEPin.valueType` field: `{ category, subCategory?, subCategoryObject? }` for value type
- Operations: Add, Remove, Find, Contains, Keys, Values, Length

---

## 10. Events System

### Engine Events (Built-in)
Red-titled `K2Node_Event` nodes with `bOverrideFunction: True`.

**Lifecycle:** BeginPlay, Tick (with DeltaSeconds), EndPlay (with EndPlayReason), Construction Script
**Collision/Overlap:** ActorBeginOverlap, ActorEndOverlap, Hit (with HitResult)
**Damage:** AnyDamage, PointDamage, RadialDamage
**Pawn/Character:** Possessed, UnPossessed, OnLanded, OnWalkingOffLedge

### Custom Events
- `K2Node_CustomEvent` with `CustomFunctionName`
- User-defined input pins (parameters) but no return values
- Callable from same Blueprint or externally if exposed
- Can be marked Replicated: `Multicast`, `Run on Server`, `Run on Owning Client`

### Input Events
**Legacy Input:**
- `K2Node_InputAction` — `Pressed`/`Released` exec outputs
- `K2Node_InputAxis` — float `AxisValue` every frame
- `K2Node_InputKey` — direct key binding

**Enhanced Input (UE5):**
- `K2Node_EnhancedInputAction` with `Started`, `Ongoing`, `Triggered`, `Completed`, `Canceled` execs
- `Value` output pin type varies by action's `ValueType`
- Contexts managed via `AddMappingContext` / `RemoveMappingContext`

### Event Dispatchers / Delegates
Observer/pub-sub pattern:
1. Owner declares dispatcher with signature pins
2. Owner calls it to broadcast
3. Subscribers bind custom events with matching signature
4. When owner broadcasts, all bound events fire

Key nodes: `Call` (broadcast), `Bind` (subscribe), `Unbind`, `Unbind All`, `Assign` (create + bind)

- **Multicast delegates** — multiple subscribers (most common in BP)
- **Single-cast delegates** — one subscriber (more of a C++ pattern)

---

## 11. Functions

### Pure Functions
- No exec pins. Compact display possible
- Evaluated every time output is read — not cached
- Must have no side effects
- If same result needed multiple places, cache in local variable

### Impure Functions
- Exec in/out pins. Called once when exec flow reaches them
- Can modify state, spawn actors, play sounds

### Latent Functions
- Pause execution, resume later. Clock icon
- Exec output pins fire at different times (e.g., `Completed` after delay)
- Cannot be placed inside functions — only Event Graphs or Macros
- Multiple can run concurrently from different exec branches

### Function Structure
- **Entry:** `K2Node_FunctionEntry` with `SignatureName`
- **Result:** `K2Node_FunctionResult` with return value pins
- Can have multiple output pins but only one exec output (unlike macros)
- Parameters can be pass-by-reference (diamond icon)

### Access Specifiers
- **Public:** accessible from other Blueprints
- **Protected:** accessible from Blueprint and children only
- **Private:** accessible only within the defining Blueprint

---

## 12. Macros vs Functions

| Aspect | Functions | Macros |
|--------|-----------|--------|
| **Compilation** | Called as subroutine | Inlined at compile time |
| **Exec pins** | One exec in, one exec out | Multiple exec inputs/outputs |
| **Latent nodes** | NOT allowed | Allowed (inlines into EventGraph) |
| **Overridable** | Yes | No |
| **Cross-BP callable** | Yes | No (except via Macro Libraries) |
| **Local variables** | Named local variables | Anonymous scratch values |
| **Networking** | Can be replicated | Cannot be replicated |
| **Performance** | Slight call overhead | Zero overhead (inlined), larger compiled graph |
| **Debugging** | Full step-through | Breakpoints on inlined nodes only |

---

## 13. Blueprint Interfaces

**Contract-based communication without casting:**
- Created as standalone assets — function signatures only, no implementation
- Blueprints "implement" the interface, providing their own logic
- If function has return values → function to implement. If no returns → event
- Caller uses "Interface Message" node (blue function call)
- If target doesn't implement → silently fails (no crash, no cast needed)

**Advantages over casting:**
- No hard dependency (reduces load times, avoids circular references)
- Works with any actor implementing the interface (polymorphism)
- Safe to call on non-implementing actors

---

## 14. Blueprint Communication Patterns

### Direct Reference
Hold a variable of another Blueprint's type, call functions directly. Hard reference creates load dependency. Soft reference loads on demand.

### Casting
`Cast To <ClassName>` — takes generic reference, outputs class-specific reference. Creates hard reference (loads target class into memory). Cheap type check, but expensive loading side effect.

### Interface Messages
Preferred for many-to-many communication without coupling.

### Event Dispatchers
Preferred for one-to-many notification. Owner broadcasts, subscribers react.

### Level Blueprint Communication
- Level BP to Actor: direct reference (select in viewport)
- Actor to Level BP: event dispatchers
- Tied to specific level — cannot be reused

---

## 15. Timelines

`K2Node_Timeline` — animate values over time using curves.

**Exec Pins:**
- Inputs: `Play`, `Play from Start`, `Stop`, `Reverse`, `Reverse from Start`
- Outputs: `Update` (every frame while playing), `Finished` (playback ends), `Direction`

**Track Types:**
- **Float Track:** interpolated float along curve
- **Vector Track:** 3-float vector along curves
- **Event Track:** fires exec at keyframe times
- **Color Track:** linear color along gradient
- **External Curve:** references CurveFloat/CurveVector asset

**Properties:** Length, Loop, Auto Play, Ignore Time Dilation, Replicated

**Key behaviors:**
- Latent — only exist in Event Graphs (not functions)
- `Update` fires every frame while playing
- `Play` while already playing continues from current position (no restart)
- Multiple timelines can run concurrently

---

## 16. Components

### Scene Components (have transform)
`StaticMeshComponent`, `SkeletalMeshComponent`, `CameraComponent`, `SpringArmComponent`, `PointLightComponent`, `SpotLightComponent`, `AudioComponent`, `ParticleSystemComponent`/`NiagaraComponent`, `SceneComponent` (base), `ChildActorComponent`

### Actor Components (no transform)
`ActorComponent` (base), `CharacterMovementComponent`, `ProjectileMovementComponent`, `RotatingMovementComponent`, `InputComponent`, `WidgetComponent`

### Collision Components
`BoxComponent`, `SphereComponent`, `CapsuleComponent` — primitive collision shapes for triggers, hit detection, character collision

### Component Hierarchy
- Every actor has a **Root Component** at top of transform hierarchy
- Children inherit parent transform
- `DefaultSceneRoot` auto-created when no root specified

### Runtime Operations
- **Add Component** — spawns at runtime, returns reference
- **Destroy Component** — removes from actor
- **Attach/Detach** — reparent with attachment rules (KeepRelative, KeepWorld, SnapToTarget)

---

## 17. Graph Editor UX & Interaction

### Viewport Navigation
- **Pan:** Middle-mouse drag, or right-click drag on empty canvas
- **Zoom:** Mouse scroll wheel (extensive range)
- **Zoom-to-fit:** Home key; or select nodes + zoom to selection
- **Selection:** Click (single), Ctrl+Click (add/remove), drag marquee (box), Shift+drag (additive)

### Node Placement
- **Right-click canvas:** Searchable context menu listing all placeable nodes
- **Drag from pin:** Filtered context menu showing only compatible nodes
- **My Blueprint panel:** Drag variables, functions, macros, event dispatchers onto graph

### Node Interaction
- Drag to move. Multi-selected nodes move together
- Double-click function/macro node → opens sub-graph
- Nodes can be collapsed into sub-graphs (right-click → Collapse Nodes) creating tunnel entry/exit nodes

### Wire Interaction
- **Create:** Drag from output pin to compatible input pin
- **Break:** Alt+Click on connected pin, or right-click pin → "Break Link(s)"
- **Auto-cast:** Connecting compatible-but-different types auto-inserts conversion node
- **Reroute:** Double-click a wire to insert reroute node (`K2Node_Knot`)

### Right-Click Menus

**Canvas right-click (empty space):** Opens All Actions node browser — searchable, hierarchical, context-sensitive

**Pin drag release:** Shows filtered subset of nodes with compatible pins only

**Node right-click:** Breakpoint, Collapse Nodes, Expand, Duplicate, Delete, Find References, Documentation, Add Comment

**Pin right-click:** Break Link(s), Promote to Variable, Promote to Local Variable, Split/Recombine Struct Pin, Reset to Default Value

---

## 18. Best Practices

### Graph Organization
- **Comment blocks:** Group related nodes in named, color-coded boxes
- **Reroute nodes:** Clean up long wire runs, prevent crossing
- **Alignment:** Align nodes left/right/top/bottom, distribute evenly
- **Left-to-right flow:** Exec flow reads left to right
- **Function extraction:** If copy-pasting same cluster more than twice, extract into function/macro
- **Naming:** PascalCase for functions/events. Boolean variables prefixed with `b` (e.g., `bIsAlive`)

### Performance
- **Avoid Tick:** Use `SetTimerByFunctionName` instead (periodic at N-second intervals)
- **Minimize Cast To:** Each unique cast creates a hard reference. Use interfaces instead
- **Cache pure results:** Pure functions re-evaluate on every read. Cache in local variable if used multiple times
- **Heavy math in C++:** Matrix math, pathfinding, string operations better in C++
- **Disable Tick:** `SetActorTickEnabled(false)` or uncheck "Start with Tick Enabled"

### Naming Conventions
- Blueprint assets: `BP_` prefix (e.g., `BP_PlayerCharacter`)
- Widget Blueprints: `WBP_` prefix
- Blueprint Interfaces: `BPI_` prefix
- Enumerations: `E` prefix (e.g., `EWeaponType`)
- Functions: verb-first (e.g., `CalculateDamage`, `UpdateHealth`)
- Event Dispatchers: `On` prefix (e.g., `OnHealthChanged`, `OnDeath`)

### Modular Design
- **Component-based design:** Favor components over deep inheritance. `HealthComponent`, `InventoryComponent`, `InteractionComponent` mix-and-match
- **Data-driven:** Data Tables and Data Assets for tuning values
- **Blueprint Function Libraries:** Static utility functions accessible from any Blueprint
- **Game Instance:** Persistent singleton across levels for save data, global state

---

## 19. C++ ↔ Blueprint Relationship

### Design Philosophy
Gameplay programmers create **base C++ classes** exposing useful functions/properties. Designers **extend in Blueprints**. Extension, not replacement.

### C++ to Blueprint Bridge
- `UCLASS(Blueprintable)` — class can be subclassed in Blueprints
- `UPROPERTY(BlueprintReadWrite)` / `BlueprintReadOnly` — accessible in graphs
- `UFUNCTION(BlueprintCallable)` — callable from Blueprints
- `UFUNCTION(BlueprintImplementableEvent)` — declared in C++, implemented in Blueprint
- `UFUNCTION(BlueprintNativeEvent)` — C++ default, Blueprint can override
- `UFUNCTION(BlueprintPure)` — marks as pure (no exec pins)

### Performance
- Blueprint VM is ~8-10x slower than native C++ for equivalent logic
- UE5: general VM improvements, Verse language as alternative
- Hybrid pattern: C++ base class + Blueprint child for configuration/events

### Compilation
Blueprints compile to bytecode executed by Blueprint Virtual Machine. Compiled class (`UBlueprintGeneratedClass`) is a real UClass in the engine's reflection system.

---

## 20. T3D Serialization Format

### Pin Format
```
CustomProperties Pin (PinId=<32-char-hex>,PinName="<name>",
  PinFriendlyName="<display>",PinToolTip="...",
  Direction="EGPD_Input|EGPD_Output",
  PinType.PinCategory="<category>",
  PinType.PinSubCategory="<sub>",
  PinType.PinSubCategoryObject="<path>",
  PinType.ContainerType=None|Array|Set|Map,
  PinType.PinValueType=(...),
  DefaultValue="<value>",AutogeneratedDefaultValue="<value>",
  LinkedTo=(PinId1,PinId2,...))
```

### Critical T3D Constraints
- **Pin IDs:** exactly 32-character uppercase hexadecimal (0-9, A-F only). Non-hex = UE silently drops ALL connections
- **Node GUIDs:** exactly 32-character uppercase hex, unique across all nodes
- **PinCategory values:** `exec`, `bool`, `real`, `int`, `byte`, `string`, `name`, `text`, `object`, `class`, `struct`, `enum`, `interface`, `delegate`, `wildcard`
- **Hidden pins:** `self` and `WorldContextObject` must be present in T3D but are not shown visually
- **LatentInfo:** Required hidden pin for latent functions
- **AutogeneratedDefaultValue:** Only emitted when explicitly set (no mirroring from DefaultValue)

---

## 21. Implications for ue-flow

This reference informs the following ue-flow design decisions:

1. **Exec pin logic:** Pure = never exec pins. Impure = always exec pins. Latent = clock icon + async outputs. Macros = multiple exec outputs
2. **Node placement UX:** Right-click canvas for searchable menu (context-sensitive). Drag-from-pin for filtered compatible nodes. Sidebar drag for variables/functions
3. **Connection drawing:** Type-compatible only with implicit conversions. Exec output replaces existing. Data input replaces existing. Data output allows fan-out
4. **Wire behavior:** Alt+click to break. Right-click pin for Break Link(s). Double-click wire for reroute
5. **Graph types:** EventGraph (multiple events), ConstructionScript (single entry), Function (single entry/result, no latent), Macro (inline, multiple exec outputs)
6. **Event Dispatchers:** Need Bind/Unbind/Call node representations with delegate signature pins
7. **Interface messages:** Blue-colored function calls (distinct from regular green)
8. **Timeline nodes:** Special multi-pin layout with playback controls and track outputs
9. **Component handling:** Component references as pins, Add/Destroy nodes, component delegate binding
10. **Comment blocks:** Visual organization behind nodes. Color-coded, resizable, titled
11. **Variable access:** Get = pure (no exec). Set = impure (has exec). Title = variable name only
12. **Dynamic pins:** Sequence, MakeArray, Select, commutative operators, SwitchInteger support add/remove pins
13. **Struct Break/Make:** Auto-generate pins from struct field definitions
14. **Cast nodes:** Auto-generate output "As [Class]" pin + Cast Failed exec
