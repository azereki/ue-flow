# GraphAPI Node Operations

Node operations cover creating, deleting, and duplicating nodes in the graph. All methods return a `CommandResult` and capture an undo snapshot before mutating state.

## addNode

Creates a node from a `NodeSpec` -- a plain object describing the node's class, title, position, and pins. This is the low-level creation method that handles both blueprint nodes and comment nodes.

### Signature

```ts
addNode(spec: NodeSpec): CommandResult
```

### NodeSpec

```ts
interface NodeSpec {
  nodeClass: string;                       // UE class name (e.g. "K2Node_CallFunction")
  title: string;                           // Display title
  position: { x: number; y: number };      // Canvas position
  type?: string;                           // UE semantic type override (auto-inferred if omitted)
  properties?: Record<string, unknown>;    // UE properties (FunctionReference, etc.)
  pins?: Partial<UEPin>[];                 // Pin definitions (IDs auto-generated if missing)
  description?: string;
  category?: string;
  width?: number;                          // For comment nodes only
  height?: number;                         // For comment nodes only
}
```

### What addNode does internally

1. Generates a 32-char hex GUID for the node
2. Infers the UE semantic type from the class name (event, call_function, variable_get, flow_control, comment, etc.)
3. For comment nodes: creates a `CommentFlowNode` with the specified dimensions (defaults to 400x200), `zIndex: -2000`
4. For blueprint nodes:
   - Normalizes each pin via `normalizeGeneratedPin()` and assigns GUIDs to pins missing IDs
   - Calls `synthesizeNodePropertiesWithDB()` to fill UE-required properties (FunctionReference, EventReference, etc.)
   - Estimates node dimensions from title length and pin count
   - Computes header accent color for variable getter/setter nodes based on pin type

### Auto-generated pins for special node classes

Certain node classes automatically generate their full pin sets when created via `addNode`:

- **`K2Node_DynamicCast`** -- generates Object input pin, exec in/out pins, Cast Failed exec output, and `As [Class]` output pin based on the target class
- **`K2Node_BreakStruct`** -- generates a struct input pin plus individual field output pins from the struct registry (`struct-registry.ts`)
- **`K2Node_MakeStruct`** -- generates individual field input pins plus a struct output pin from the struct registry

### Examples

**Add a Print String function call:**

```ts
const api = useGraphAPI();

api.addNode({
  nodeClass: 'K2Node_CallFunction',
  title: 'Print String',
  position: { x: 400, y: 200 },
  properties: {
    FunctionReference: '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
  },
  pins: [
    { name: 'execute', direction: 'input', category: 'exec' },
    { name: 'then', direction: 'output', category: 'exec' },
    { name: 'In String', direction: 'input', category: 'string', defaultValue: 'Hello' },
    { name: 'bPrintToScreen', direction: 'input', category: 'bool', defaultValue: 'true' },
  ],
});
```

**Add a comment block:**

```ts
api.addNode({
  nodeClass: 'EdGraphNode_Comment',
  title: 'Health System',
  position: { x: 100, y: 50 },
  width: 600,
  height: 300,
});
```

**Add a variable getter:**

```ts
api.addNode({
  nodeClass: 'K2Node_VariableGet',
  title: 'Health',
  position: { x: 200, y: 300 },
  properties: {
    VariableReference: '(MemberName="Health",bSelfContext=True)',
  },
  pins: [
    { name: 'Health', direction: 'output', category: 'real' },
  ],
});
```

## addNodeFromSignature

Creates a node by looking up a UE function name in the signature database (`ue-signatures.json`, 2,756 functions). This is the preferred method for AI commands since it only requires a function name.

### Signature

```ts
addNodeFromSignature(
  memberName: string,
  position: { x: number; y: number }
): CommandResult
```

### How it works

1. Calls `lookupFunction(memberName)` to find the function in the signature DB
2. If not found, returns `{ success: false, error: 'Unknown function: ...' }`
3. Maps each signature pin to a `Partial<UEPin>` with generated IDs
4. Constructs a FunctionReference property string from the signature's `memberParent` and `memberName`
5. Delegates to `addNode()` with the assembled spec

### Examples

```ts
// Add a Delay node -- all pins and properties auto-populated from signature DB
api.addNodeFromSignature('Delay', { x: 600, y: 200 });

// Add SetActorLocation
api.addNodeFromSignature('K2_SetActorLocation', { x: 800, y: 200 });

// Returns error for unknown functions
const result = api.addNodeFromSignature('NotARealFunction', { x: 0, y: 0 });
// result.success === false, result.error === 'Unknown function: NotARealFunction'
```

## deleteNodes

Deletes one or more nodes and automatically removes all edges connected to them.

### Signature

```ts
deleteNodes(nodeIds: string[]): CommandResult
```

### Example

```ts
// Delete selected nodes
const selected = api.getSelectedNodeIds();
api.deleteNodes(selected);

// Delete a specific node by ID
api.deleteNodes(['K2Node_CallFunction_A1B2C3D4']);
```

**Behavior notes:**
- Empty array is a no-op (`{ success: true }`)
- Edges where the deleted node is either source or target are removed
- Works on both blueprint nodes and comment nodes

## duplicateNodes

Clones one or more nodes with offset positioning (+20, +20) and fresh GUIDs. Internal edges (where both source and target are in the duplicated set) are also cloned.

### Signature

```ts
duplicateNodes(nodeIds: string[]): CommandResult
```

### What gets cloned

- Node position offset by (20, 20)
- New node ID: `{originalId}_copy_{8-char-hex}`
- New nodeGuid (32-char hex)
- All pins get new IDs (maintaining the pin ID map for edge re-linking)
- Internal edges get new IDs with remapped source/target handles
- `selected` is set to `false` on all clones

### Example

```ts
// Duplicate selected nodes (preserving internal wiring)
const selected = api.getSelectedNodeIds();
const result = api.duplicateNodes(selected);

if (result.success) {
  console.log('Created:', result.createdIds); // IDs of the new nodes
}
```

## setNodeTitle

Changes the display title of a node. Works on both blueprint and comment nodes.

### Signature

```ts
setNodeTitle(nodeId: string, title: string): CommandResult
```

### Example

```ts
// Rename a comment
const comments = api.findNodesByTitle('TODO');
if (comments.length > 0) {
  api.setNodeTitle(comments[0].id, 'DONE - Health System');
}
```

## insertRerouteNode

Splits an existing edge by inserting a `K2Node_Knot` reroute node at the specified position. Triggered by double-clicking an edge in the UI.

### Signature

```ts
insertRerouteNode(
  edgeId: string,
  position: { x: number; y: number },
): CommandResult
```

### How it works

1. Finds the existing edge by ID
2. Creates a new `K2Node_Knot` reroute node at the given position with passthrough pins matching the edge's data category
3. Removes the original edge
4. Creates two new edges: source→reroute and reroute→target
5. All changes are captured as a single undo entry

### Example

```ts
// Insert a reroute node on an edge (typically from a double-click handler)
api.insertRerouteNode('e_A1B2C3D4E5F6', { x: 400, y: 200 });
```

## pasteNodes

Bulk-inserts nodes and edges from clipboard data as a single undo entry. Used by the Ctrl+V paste operation. Node and pin IDs are remapped by the clipboard utilities before calling this method to avoid ID collisions.

### Signature

```ts
pasteNodes(
  nodes: Array<...>,
  edges: Array<...>,
): CommandResult
```

### Example

```ts
// Paste clipboard contents (IDs already remapped by clipboard utilities)
const result = api.pasteNodes(remappedNodes, remappedEdges);
if (result.success) {
  console.log('Pasted:', result.createdIds);
}
```

## setNodeAnnotation

Adds, updates, or removes a text annotation displayed above a node.

### Signature

```ts
setNodeAnnotation(
  nodeId: string,
  text: string,       // Pass empty string to remove
): CommandResult
```

### Example

```ts
// Add an annotation
api.setNodeAnnotation(nodeId, 'Wait 2 seconds before firing');

// Remove an annotation
api.setNodeAnnotation(nodeId, '');
```

## Type Inference

When `NodeSpec.type` is omitted, `addNode` infers the UE semantic type from the class name:

| nodeClass contains | Inferred type |
|--------------------|--------------|
| `Event`, `CustomEvent` | `event` |
| `VariableGet` | `variable_get` |
| `VariableSet` | `variable_set` |
| `IfThenElse`, `ForEach`, `Sequence`, `DoOnce`, `Gate`, `FlipFlop`, `MultiGate`, `Delay` | `flow_control` |
| `DynamicCast`, `ClassDynamicCast` | `cast` |
| `Comment` | `comment` |
| `Knot` | `reroute` |
| `BreakStruct`, `MakeStruct` | `call_function` |
| `Select` | `select` |
| `Switch` | `switch` |
| *(default)* | `call_function` |

## See Also

- [Edge Operations](./GraphAPI-Edge-Operations.md) -- connecting nodes
- [Pin & Property Operations](./GraphAPI-Pin-Property-Operations.md) -- modifying node data
- [AI Command Protocol](./AI-Command-Protocol.md) -- how AI uses `addNode` via commands
