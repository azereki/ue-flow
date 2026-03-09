# GraphAPI Pin & Property Operations

These operations modify data on existing nodes -- pin default values, arbitrary properties, and display titles.

## setPinValue

Sets the `defaultValue` of a pin on a blueprint node.

### Signature

```ts
setPinValue(
  nodeId: string,   // Node ID
  pinId: string,    // Pin name or pin ID (32-char hex)
  value: string,    // New default value (always a string)
): CommandResult
```

Pin lookup accepts either the pin's display name or its internal ID. Name-based lookup is tried first, which makes this convenient for AI commands that reference pins by their visible labels.

### Pin value types

All pin values are stored as strings, matching UE's T3D serialization format. The interpretation depends on the pin category:

| Pin Category | Value Format | Example |
|-------------|-------------|---------|
| `bool` | `"true"` or `"false"` | `"true"` |
| `int` | Integer string | `"42"` |
| `real` / `float` | Decimal string | `"3.14"` |
| `string` | Plain text | `"Hello World"` |
| `name` | UE name string | `"MyVariableName"` |
| `text` | UE text format | `"NSLOCTEXT(\"...\", \"...\", \"Hello\")"` |
| `byte` | Integer or enum value | `"255"` or `"ECollisionChannel::ECC_Visibility"` |
| `vector` | Component string | `"X=1.0,Y=2.0,Z=3.0"` |
| `rotator` | Component string | `"P=0.0,Y=90.0,R=0.0"` |
| `enum` | Enum path::value | `"EMovementMode::MOVE_Walking"` |

> **Note:** Enum pins with known values in the enum registry (`enum-registry.ts`) display a dropdown editor in the UI, allowing users to select from valid enum values rather than typing raw strings.

### Examples

```ts
const api = useGraphAPI();

// Set a Delay node's Duration to 2 seconds
const delayNodes = api.findNodesByTitle('Delay');
if (delayNodes.length > 0) {
  api.setPinValue(delayNodes[0].id, 'Duration', '2.0');
}

// Set a Print String's input text
api.setPinValue(printNodeId, 'In String', 'Player took damage!');

// Set a boolean default
api.setPinValue(nodeId, 'bPrintToScreen', 'true');
```

## setNodeProperty

Sets an arbitrary key-value property in the node's `properties` dictionary. Works on both blueprint nodes and comment nodes.

### Signature

```ts
setNodeProperty(
  nodeId: string,
  key: string,
  value: unknown,
): CommandResult
```

### Common UE properties

| Property | Node Type | Example Value |
|----------|-----------|---------------|
| `FunctionReference` | K2Node_CallFunction | `'(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")'` |
| `EventReference` | K2Node_Event | `'(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")'` |
| `VariableReference` | K2Node_VariableGet/Set | `'(MemberName="Health",bSelfContext=True)'` |
| `bOverrideFunction` | K2Node_Event | `'True'` |
| `SignatureName` | K2Node_FunctionEntry | `'MyCustomFunction'` |
| `bIsPureFunc` | K2Node_CallFunction | `true` |
| `sizeX` | EdGraphNode_Comment | `600` |
| `sizeY` | EdGraphNode_Comment | `300` |

### Examples

```ts
// Change a function call's target function
api.setNodeProperty(nodeId, 'FunctionReference',
  '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="Delay")'
);

// Set a comment's size
api.setNodeProperty(commentId, 'sizeX', 800);
api.setNodeProperty(commentId, 'sizeY', 400);
```

## setNodeTitle

Changes the display title shown in the node header. Documented in [Node Operations](./GraphAPI-Node-Operations.md#setnodetitle), included here for completeness.

```ts
api.setNodeTitle(nodeId, 'New Display Title');
```

## Undo behavior

Each of these three methods captures a full-state undo snapshot before applying the change. When called inside a `executeBatch()`, only one snapshot is captured for the entire batch.

## setNodeAnnotation

Adds, updates, or removes a text annotation displayed above a node. Pass an empty string to remove an existing annotation.

```ts
api.setNodeAnnotation(nodeId, 'This handles the health regen tick');
api.setNodeAnnotation(nodeId, '');  // removes annotation
```

See [Node Operations](./GraphAPI-Node-Operations.md#setnodeannotation) for full details.

## See Also

- [Node Operations](./GraphAPI-Node-Operations.md) -- creating nodes with initial pin values
- [Query Operations](./GraphAPI-Query-Operations.md) -- finding nodes to modify
- [AI Command Protocol](./AI-Command-Protocol.md) -- `setPinValue`, `setNodeTitle`, and `annotateNode` commands
