# GraphAPI Batch Execution and Undo/Redo

## Undo/Redo mechanics

GraphAPI uses **full-state snapshots** for undo/redo. Before each mutation, the entire nodes and edges arrays are shallow-copied and pushed onto the undo stack.

### Stack behavior

| Event | Undo Stack | Redo Stack |
|-------|-----------|-----------|
| Any mutation | Push current state | **Cleared** |
| `undo()` | Pop last entry, restore state | Push pre-undo state |
| `redo()` | Push current state | Pop last entry, restore state |

The redo stack is cleared whenever a new mutation occurs. This prevents inconsistent state from mixing old redo entries with new mutations.

### Max depth

The undo stack holds at most **50 entries** (`MAX_UNDO = 50`). When the 51st entry is pushed, the oldest entry is shifted off the front. This bounds memory usage since each entry contains a full copy of nodes and edges.

### API

```ts
const api = useGraphAPI();

api.undo();     // Returns true if state was restored, false if stack empty
api.redo();     // Returns true if state was restored, false if stack empty
api.canUndo;    // boolean — true if undo stack is non-empty
api.canRedo;    // boolean — true if redo stack is non-empty
```

### External snapshots

For mutations that happen outside GraphAPI (e.g., React Flow's built-in node drag), call `captureSnapshot()` before the operation begins:

```ts
// In an onNodeDragStart handler:
api.captureSnapshot('drag nodes');

// Later, in onNodeDragStop:
api.moveNodes(moves);
// moveNodes does NOT capture a snapshot — it expects the caller already did
```

This avoids double-snapshotting and ensures the undo entry captures the pre-drag state.

## executeBatch

Executes multiple `GraphCommand` objects as a single atomic operation with one undo entry.

### Signature

```ts
executeBatch(commands: GraphCommand[]): BatchResult

interface BatchResult {
  results: CommandResult[];   // One result per command
  allSucceeded: boolean;      // True if every command succeeded
}
```

### How batch undo works

1. `executeBatch` captures a single snapshot before running any commands
2. Each command is dispatched via `executeCommand()`, which calls the corresponding GraphAPI method
3. Each method pushes its own snapshot (normal behavior)
4. After all commands complete, `executeBatch` collapses the stack -- it removes all intermediate snapshots, keeping only the one it captured at the start
5. Result: one undo entry for the entire batch, regardless of how many commands ran

```
Stack before batch:     [snap_A, snap_B]
executeBatch captures:  [snap_A, snap_B, snap_batch]
Command 1 pushes:       [snap_A, snap_B, snap_batch, snap_1]
Command 2 pushes:       [snap_A, snap_B, snap_batch, snap_1, snap_2]
Collapse (splice):      [snap_A, snap_B, snap_batch]
                                                 ↑ single undo point
```

### Example: Programmatic batch

```ts
const api = useGraphAPI();

const result = api.executeBatch([
  {
    type: 'addNodeFromSignature',
    payload: { memberName: 'Delay', position: { x: 400, y: 200 } },
  },
  {
    type: 'addNodeFromSignature',
    payload: { memberName: 'PrintString', position: { x: 800, y: 200 } },
  },
]);

if (result.allSucceeded) {
  // Both nodes added — one Ctrl+Z undoes both
  const delayId = result.results[0].createdIds?.[0];
  const printId = result.results[1].createdIds?.[0];
}
```

### Partial failures

Batch execution does not roll back on failure. If command 2 of 5 fails, commands 1, 3, 4, and 5 still execute. Check individual results:

```ts
const result = api.executeBatch(commands);
for (let i = 0; i < result.results.length; i++) {
  if (!result.results[i].success) {
    console.warn(`Command ${i} failed: ${result.results[i].error}`);
  }
}
```

A single `undo()` call still reverts all successful commands since the snapshot was captured before any of them ran.

## AI batch usage

The [AI Command Protocol](./AI-Command-Protocol.md) uses a manual snapshot + sequential execution pattern rather than `executeBatch`:

```ts
// In ai-commands.ts executeAICommands():
api.captureSnapshot('AI commands');

for (const cmd of cmdResponse.commands) {
  const result = executeSingleCommand(api, cmd);
  // ...collect results
}
```

This achieves the same single-undo-entry behavior: one `captureSnapshot` before the loop, individual commands add their own snapshots (which the user can undo through), but the AI's pre-batch snapshot anchors the group.

The practical effect: pressing Ctrl+Z after an AI command batch undoes the entire batch in one step.

## GraphCommand type reference

All twelve command types and their payloads:

```ts
// Delete
{ type: 'deleteNodes',    payload: { nodeIds: ['id1', 'id2'] } }
{ type: 'deleteEdges',    payload: { edgeIds: ['e_123'] } }

// Duplicate
{ type: 'duplicateNodes', payload: { nodeIds: ['id1'] } }

// Create
{ type: 'addNode',              payload: { nodeClass: '...', title: '...', position: {x,y}, ... } }
{ type: 'addNodeFromSignature', payload: { memberName: 'Delay', position: {x,y} } }
{ type: 'addEdge',              payload: { source: 'id1', sourcePin: 'then', target: 'id2', targetPin: 'execute' } }

// Modify
{ type: 'setPinValue',     payload: { nodeId: 'id', pinId: 'Duration', value: '2.0' } }
{ type: 'setNodeProperty', payload: { nodeId: 'id', key: 'bIsPureFunc', value: true } }
{ type: 'setNodeTitle',    payload: { nodeId: 'id', title: 'New Title' } }

// Move
{ type: 'moveNodes', payload: { moves: [{ nodeId: 'id', position: {x: 100, y: 200} }] } }

// Reroute
{ type: 'insertRerouteNode', payload: { edgeId: 'e_123', position: {x: 400, y: 200} } }

// Annotations
{ type: 'setNodeAnnotation', payload: { nodeId: 'id', text: 'Note text' } }
```

## See Also

- [GraphAPI Overview](./GraphAPI-Overview.md) -- architecture and undo/redo summary
- [AI Command Protocol](./AI-Command-Protocol.md) -- how AI commands use batch execution
