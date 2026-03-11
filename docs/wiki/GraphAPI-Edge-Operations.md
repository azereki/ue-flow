# GraphAPI Edge Operations

Edge operations handle creating and deleting connections between Blueprint node pins.

## addEdge

Creates a connection between two pins on different nodes.

### Signature

```ts
addEdge(
  source: string,      // Source node ID
  sourcePin: string,   // Source pin name or ID
  target: string,      // Target node ID
  targetPin: string,   // Target pin name or ID
): CommandResult
```

Pins can be identified by either their display name (e.g., `"then"`, `"ReturnValue"`) or their internal 32-char hex ID. Name-based lookup is tried first.

### Validation

`addEdge` performs inline validation before creating the edge:

1. **Node existence** -- both source and target must exist and be blueprint nodes (not comment nodes)
2. **Pin existence** -- both pins must exist on their respective nodes
3. **Opposite directions** -- source pin and target pin must have different directions (output to input or vice versa)
4. **No self-connections** -- source and target cannot be the same node
5. **No duplicates** -- an identical edge (same source, sourceHandle, target, targetHandle) must not already exist

### Examples

```ts
const api = useGraphAPI();

// Connect Event BeginPlay's exec output to a Delay node's exec input
api.addEdge(
  'K2Node_Event_A1B2C3D4',   'then',
  'K2Node_CallFunction_E5F6', 'execute',
);

// Connect a variable getter's output to a function's input pin
api.addEdge(
  'K2Node_VariableGet_1234',  'Health',
  'K2Node_CallFunction_5678', 'Value',
);
```

### Return value

On success, `createdIds` contains the new edge ID (format: `e_{12-char-hex}`):

```ts
const result = api.addEdge(srcId, 'then', tgtId, 'execute');
if (result.success) {
  console.log('Edge created:', result.createdIds![0]);
}
```

### Edge data

Created edges include:
- `type: 'blueprintEdge'` -- uses the custom `BlueprintEdge` renderer with smooth-step routing
- `data.category` -- copied from the source pin's category (used for wire coloring)

## deleteEdges

Removes one or more edges by ID.

### Signature

```ts
deleteEdges(edgeIds: string[]): CommandResult
```

### Example

```ts
// Delete selected edges
const selected = api.getSelectedEdgeIds();
api.deleteEdges(selected);

// Delete a specific edge
api.deleteEdges(['e_A1B2C3D4E5F6']);
```

Empty array is a no-op returning `{ success: true }`.

## Connection Validator

The standalone `canConnect()` function in `connection-validator.ts` provides the same validation logic used by React Flow's `isValidConnection` callback. It checks a broader set of rules than `addEdge`'s inline checks.

### Signature

```ts
import { canConnect } from '../api/connection-validator';

function canConnect(
  sourcePin: UEPin,
  targetPin: UEPin,
  sourceNodeId: string,
  targetNodeId: string,
  existingEdges?: Array<{ source: string; sourceHandle?: string; target: string; targetHandle?: string }>,
): ConnectionValidation

interface ConnectionValidation {
  valid: boolean;
  reason?: string;
  replaces?: { source: string; sourceHandle?: string; target: string; targetHandle?: string };
}
```

### Validation Rules

| Rule | Description |
|------|-------------|
| **Opposite directions** | Output must connect to input |
| **Category compatibility** | Pin types must match (with aliases) |
| **No self-connections** | Cannot connect a node to itself |
| **No duplicate edges** | Same connection cannot exist twice (checked bidirectionally) |
| **Struct type matching** | Struct pins with different `subCategoryObject` values cannot connect |
| **Enum type matching** | Enum pins with different `subCategoryObject` values cannot connect |
| **Data input auto-replace** | Data input pins auto-replace existing connections (matches UE behavior) |
| **Exec output auto-replace** | Exec output pins auto-replace existing connections (matches UE behavior) |
| **Exec input convergence** | Exec input pins accept multiple incoming connections (flow convergence) |
| **Implicit type conversion** | `canImplicitlyConvert()` allows int→real, int→int64, byte→int, name→string, float↔double, and object subclass hierarchy |

### Category Compatibility

Pin categories must match exactly, with these exceptions:

- **`float`, `real`, and `double`** are interchangeable (UE uses all three for floating-point types)
- **`wildcard`** matches any category
- **Implicit type conversions** via `canImplicitlyConvert()`: `int`→`real`, `int`→`int64`, `int`→`double`, `byte`→`int`, `name`→`string`, `float`↔`double`, and object subclass hierarchy connections are allowed
- **Enum validation:** Enum pins must share the same `subCategoryObject` (enum type path) to connect -- two different enum types are incompatible even though both are category `byte`
- **Struct validation:** Struct pins must share the same `subCategoryObject` (struct type path) to connect -- a `Vector` output cannot connect to a `Rotator` input

### Data Input Auto-Replacement

Data input pins (all non-exec categories) allow only one incoming connection, matching UE editor behavior. When creating a new edge to a data input that already has an incoming connection:

1. `canConnect()` returns `valid: true` with the existing edge in the `replaces` field
2. `addEdge()` automatically removes the existing connection before creating the new one
3. The replacement is captured as part of the same undo snapshot

This means dragging a new data wire to an occupied input will seamlessly replace the old connection.

### Exec Output Auto-Replacement

Exec output pins allow only one outgoing connection, matching UE editor behavior. The same `replaces` mechanism applies — dragging a new exec wire from an already-connected output seamlessly replaces the old connection.

### Exec Input Convergence

Unlike data inputs and exec outputs, exec **input** pins accept **multiple incoming connections**. This enables flow convergence — e.g., both True and False branches of a Branch node connecting to the same cleanup function.

### Example: Custom validation

```ts
const validation = canConnect(
  outputPin,      // UEPin from source node
  inputPin,       // UEPin from target node
  sourceNodeId,
  targetNodeId,
  existingEdges,  // current edges array
);

if (!validation.valid) {
  showToast(`Cannot connect: ${validation.reason}`);
}
```

## Edge ID Format

Edge IDs follow the pattern `e_{12-char-hex}`, generated from a random 32-char GUID truncated to 12 characters. This provides sufficient uniqueness for in-session operations.

## See Also

- [Node Operations](./GraphAPI-Node-Operations.md) -- `deleteNodes` also removes connected edges
- [Query Operations](./GraphAPI-Query-Operations.md) -- `getConnectedPins` to inspect connections
- [AI Command Protocol](./AI-Command-Protocol.md) -- `addEdge` command uses node titles instead of IDs
