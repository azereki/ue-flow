# GraphAPI Overview

The GraphAPI is the single mutation gateway for all graph operations in ue-flow. Every modification -- whether triggered by a user clicking a button, dragging a node, or an AI issuing structured commands -- flows through this class.

## Architecture

```
  UI Event Handlers ──┐
                      ├──▶ GraphAPI ──▶ React Flow state (nodes/edges)
  AI Command Protocol ─┘        │
                                ▼
                         Undo/Redo Stack
```

The `GraphAPI` class wraps React Flow's `getNodes`, `getEdges`, `setNodes`, and `setEdges` accessors. It does not own the state -- it operates on whatever React Flow state store is provided at construction time.

### Constructor

```ts
import { GraphAPI } from '../api/graph-api';

const api = new GraphAPI(
  getNodes,   // () => AnyFlowNode[]
  getEdges,   // () => BlueprintFlowEdge[]
  setNodes,   // (updater: (nodes: AnyFlowNode[]) => AnyFlowNode[]) => void
  setEdges,   // (updater: (edges: BlueprintFlowEdge[]) => BlueprintFlowEdge[]) => void
);
```

## Access via React Context

Components access the API through the `useGraphAPI()` hook, provided by `GraphAPIContext.tsx`:

```tsx
import { useGraphAPI } from '../contexts/GraphAPIContext';

function MyComponent() {
  const api = useGraphAPI();
  // api.deleteNodes([...]), api.addEdge(...), etc.
}
```

Two hooks are available:

| Hook | Behavior |
|------|----------|
| `useGraphAPI()` | Returns `GraphAPI`. Throws if used outside a provider. |
| `useGraphAPIMaybe()` | Returns `GraphAPI | null`. Safe for optional contexts. |

The provider is mounted in `App.tsx` around the graph view components.

## Command Pattern

Every mutation method follows a consistent pattern:

1. Validate inputs (node exists, pins compatible, etc.)
2. Capture undo snapshot via `captureState(label)`
3. Apply the mutation through `setNodes`/`setEdges`
4. Return a `CommandResult`

```ts
interface CommandResult {
  success: boolean;
  error?: string;
  createdIds?: string[];  // IDs of newly created nodes/edges
}
```

## Undo/Redo

GraphAPI maintains two stacks of full-state snapshots:

- **Undo stack** -- pushed before every mutation (max 50 entries, oldest dropped when exceeded)
- **Redo stack** -- pushed when undoing, cleared when any new mutation occurs

```ts
api.undo();    // Restores previous state, returns false if stack empty
api.redo();    // Re-applies undone state, returns false if stack empty
api.canUndo;   // boolean getter
api.canRedo;   // boolean getter
```

For external operations like node drags (where the mutation happens outside GraphAPI), call `captureSnapshot()` before the drag starts:

```ts
api.captureSnapshot('drag nodes');
// ...user drags...
api.moveNodes(moves);
```

See [Batch and Undo](./GraphAPI-Batch-and-Undo.md) for batch execution details.

## Operation Layers

The API is organized into five layers:

| Layer | Operations | Documentation |
|-------|-----------|---------------|
| **Delete & Duplicate** | `deleteNodes`, `deleteEdges`, `duplicateNodes` | [Node Operations](./GraphAPI-Node-Operations.md) |
| **Connection Drawing** | `addEdge` (exec output auto-replacement) | [Edge Operations](./GraphAPI-Edge-Operations.md) |
| **Node Creation** | `addNode`, `addNodeFromSignature`, `insertRerouteNode`, cast/struct auto-generation | [Node Operations](./GraphAPI-Node-Operations.md) |
| **Property Editing** | `setPinValue`, `setNodeProperty`, `setNodeTitle`, `setNodeAnnotation` | [Pin & Property Operations](./GraphAPI-Pin-Property-Operations.md) |
| **Dynamic Pins** | `addDynamicPin`, `removeDynamicPin` | [Node Operations](./GraphAPI-Node-Operations.md) |
| **Clipboard** | `pasteNodes` | [Node Operations](./GraphAPI-Node-Operations.md) |
| **Query (read-only)** | `findNodesByTitle`, `getNode`, `getEdge`, `getConnectedPins`, `getSelectedNodeIds`, `getSelectedEdgeIds` | [Query Operations](./GraphAPI-Query-Operations.md) |

Plus cross-cutting concerns:

- [Batch and Undo](./GraphAPI-Batch-and-Undo.md) -- `executeBatch`, undo/redo mechanics
- [AI Command Protocol](./AI-Command-Protocol.md) -- three-tier detection, command parsing, execution
- [Blueprint Operations](./GraphAPI-Blueprint-Operations.md) -- planned blueprint-level features

## GraphCommand Discriminated Union

All operations are representable as a `GraphCommand`, used for batch execution:

```ts
type GraphCommand =
  | { type: 'deleteNodes';         payload: { nodeIds: string[] } }
  | { type: 'deleteEdges';         payload: { edgeIds: string[] } }
  | { type: 'duplicateNodes';      payload: { nodeIds: string[] } }
  | { type: 'addEdge';             payload: { source: string; sourcePin: string; target: string; targetPin: string } }
  | { type: 'addNode';             payload: NodeSpec }
  | { type: 'addNodeFromSignature'; payload: { memberName: string; position: { x: number; y: number } } }
  | { type: 'setPinValue';         payload: { nodeId: string; pinId: string; value: string } }
  | { type: 'setNodeProperty';     payload: { nodeId: string; key: string; value: unknown } }
  | { type: 'setNodeTitle';        payload: { nodeId: string; title: string } }
  | { type: 'moveNodes';           payload: { moves: Array<{ nodeId: string; position: { x: number; y: number } }> } }
  | { type: 'insertRerouteNode';   payload: { edgeId: string; position: { x: number; y: number } } }
  | { type: 'setNodeAnnotation';   payload: { nodeId: string; text: string } };
```

## Key Files

| File | Purpose |
|------|---------|
| `js/src/api/graph-api.ts` | GraphAPI class, types, helpers |
| `js/src/api/connection-validator.ts` | `canConnect()` pin validation |
| `js/src/api/ai-commands.ts` | AI command parsing and execution |
| `js/src/contexts/GraphAPIContext.tsx` | React context provider and hooks |
| `js/src/utils/struct-registry.ts` | Struct field definitions for Break/Make nodes |
| `js/src/utils/enum-registry.ts` | Enum value definitions for dropdown editors |
| `js/src/utils/type-conversions.ts` | Implicit type conversion rules (int→real, etc.) |
| `js/src/utils/dynamic-pins.ts` | Dynamic pin add/remove logic |
