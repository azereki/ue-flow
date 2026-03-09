# GraphAPI Query Operations

Query operations are read-only methods that inspect the current graph state without modifying it. They do not capture undo snapshots.

## findNodesByTitle

Searches for nodes whose title contains the query string (case-insensitive substring match). Searches both blueprint nodes and comment nodes.

### Signature

```ts
findNodesByTitle(query: string): AnyFlowNode[]
```

### Examples

```ts
const api = useGraphAPI();

// Find all Delay nodes
const delays = api.findNodesByTitle('Delay');

// Find event nodes (matches "Event BeginPlay", "Event Tick", etc.)
const events = api.findNodesByTitle('Event');

// Find by partial match
const prints = api.findNodesByTitle('Print'); // matches "Print String", "Print Text", etc.
```

This is the primary lookup method used by the [AI Command Protocol](./AI-Command-Protocol.md) to resolve `nodeTitle` references to internal node IDs.

## getNode

Returns a single node by its exact ID, or `undefined` if not found.

### Signature

```ts
getNode(nodeId: string): AnyFlowNode | undefined
```

### Example

```ts
const node = api.getNode('K2Node_CallFunction_A1B2C3D4');
if (node && node.type === 'blueprintNode') {
  const bp = node as BlueprintFlowNode;
  console.log(bp.data.title);     // "Print String"
  console.log(bp.data.pins);      // UEPin[]
  console.log(bp.data.nodeClass); // "K2Node_CallFunction"
}
```

## getEdge

Returns a single edge by its exact ID, or `undefined` if not found.

### Signature

```ts
getEdge(edgeId: string): BlueprintFlowEdge | undefined
```

### Example

```ts
const edge = api.getEdge('e_A1B2C3D4E5F6');
if (edge) {
  console.log(edge.source, edge.target);
  console.log(edge.data?.category); // PinCategory of the connection
}
```

## getConnectedPins

Returns all pins connected to a specific pin on a node. Traverses edges in both directions -- finds pins connected to this pin whether the pin is a source or target.

### Signature

```ts
getConnectedPins(
  nodeId: string,
  pinName: string,   // Pin name or pin ID
): ConnectionInfo[]

interface ConnectionInfo {
  nodeId: string;      // Connected node's ID
  pinName: string;     // Connected pin's display name
  pinId: string;       // Connected pin's internal ID
  direction: 'input' | 'output';  // The connected pin's direction
}
```

### Examples

```ts
// What is connected to the Delay node's exec output?
const connections = api.getConnectedPins(delayNodeId, 'Completed');
for (const conn of connections) {
  console.log(`Connected to ${conn.nodeId} pin "${conn.pinName}" (${conn.direction})`);
}

// Check if an exec input is wired
const execIn = api.getConnectedPins(nodeId, 'execute');
const isWired = execIn.length > 0;
```

### How it works

1. Finds the node and resolves the pin (by name or ID)
2. Scans all edges where this node+pin appears as either source or target
3. For each matching edge, looks up the pin on the other end
4. Returns the connected pin's metadata

Returns an empty array if the node is not found, is not a blueprint node, or the pin does not exist.

## getSelectedNodeIds

Returns IDs of all currently selected nodes.

### Signature

```ts
getSelectedNodeIds(): string[]
```

### Example

```ts
// Delete all selected nodes
const selected = api.getSelectedNodeIds();
if (selected.length > 0) {
  api.deleteNodes(selected);
}
```

## getSelectedEdgeIds

Returns IDs of all currently selected edges.

### Signature

```ts
getSelectedEdgeIds(): string[]
```

### Example

```ts
// Delete all selected edges
const selected = api.getSelectedEdgeIds();
if (selected.length > 0) {
  api.deleteEdges(selected);
}
```

## Node type narrowing

`AnyFlowNode` is a union of `BlueprintFlowNode | CommentFlowNode`. Use the `type` discriminant to narrow:

```ts
const node = api.getNode(id);
if (!node) return;

if (node.type === 'blueprintNode') {
  const bp = node as BlueprintFlowNode;
  // bp.data.pins, bp.data.nodeClass, bp.data.properties, etc.
}

if (node.type === 'commentNode') {
  const comment = node as CommentFlowNode;
  // comment.data.title, comment.data.properties
}
```

## See Also

- [Node Operations](./GraphAPI-Node-Operations.md) -- mutations that use query results
- [AI Command Protocol](./AI-Command-Protocol.md) -- title-based resolution via `findNodesByTitle`
