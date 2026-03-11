# AI Command Protocol

The AI command protocol enables the AI chat assistant to make incremental modifications to an existing graph using structured JSON commands, rather than regenerating the entire graph from scratch.

## Three-tier detection

When a user sends a message in the AI chat, the system classifies the intent into one of three tiers, checked in order:

| Tier | Detection | Response format | Example |
|------|-----------|----------------|---------|
| **Command** | `isCommandRequest()` matches modification language | JSON command block | "Delete the Delay node" |
| **Generation** | `isGenerationRequest()` matches creation language | Full `UEGraphJSON` | "Generate a health regen system" |
| **Analyst** | Default (no match) | Natural language | "What does this node do?" |

Command detection runs first. If the message matches command signals, the `COMMAND_SCHEMA_ADDENDUM` prompt is appended to guide the AI to return structured commands. If it does not match commands but matches generation signals, the `GENERATE_SCHEMA_ADDENDUM` is appended instead. Otherwise, the AI responds as an analyst.

## isCommandRequest

Heuristic function that checks for modification language in the user's message:

```ts
import { isCommandRequest } from '../api/ai-commands';

isCommandRequest('Delete the Delay node');           // true
isCommandRequest('Connect BeginPlay to Print String'); // true
isCommandRequest('Set the value of Duration to 3');   // true
isCommandRequest('What does Print String do?');       // false
isCommandRequest('Generate a damage system');         // false
```

### Command signals

The following phrases trigger command mode (case-insensitive substring match):

- **Delete/remove:** `delete the`, `remove the`, `delete node`, `remove node`
- **Connect/disconnect:** `connect`, `wire`, `disconnect`, `unwire`
- **Rename:** `rename`, `change the name`, `set the name`
- **Move:** `move the`, `reposition`
- **Values:** `set the value`, `change the value`, `set value`, `change value`, `set pin`, `change pin`
- **Create:** `add a node`, `add node`, `insert a node`, `insert node`
- **Duplicate:** `duplicate the`, `copy the`, `clone the`

## Command JSON format

The AI returns a JSON code block containing an array of commands and an optional explanation:

~~~json
```json
{
  "commands": [
    {"action": "deleteNode", "params": {"nodeTitle": "Print String"}},
    {"action": "addEdge", "params": {"sourceTitle": "Event BeginPlay", "sourcePin": "then", "targetTitle": "Delay", "targetPin": "execute"}}
  ],
  "explanation": "Removed Print String and connected BeginPlay directly to Delay."
}
```
~~~

### Disambiguation from UEGraphJSON

`parseAICommands()` distinguishes command blocks from generation blocks by checking:
- Must have a `"commands"` array -- otherwise not commands
- Must NOT have a `"nodes"` array -- that indicates a `UEGraphJSON` generation response

## The 11 actions

### deleteNode

Deletes a node and all its connections.

```json
{"action": "deleteNode", "params": {"nodeTitle": "Print String"}}
```

| Param | Type | Description |
|-------|------|-------------|
| `nodeTitle` | string | Display title of the node to delete |

### deleteEdge

Deletes a specific connection between two pins.

```json
{"action": "deleteEdge", "params": {
  "sourceTitle": "Event BeginPlay",
  "sourcePin": "then",
  "targetTitle": "Delay",
  "targetPin": "execute"
}}
```

| Param | Type | Description |
|-------|------|-------------|
| `sourceTitle` | string | Source node's display title |
| `sourcePin` | string | Source pin name |
| `targetTitle` | string | Target node's display title |
| `targetPin` | string | Target pin name |

Resolves node titles to IDs, then uses `findEdgeByPins()` to locate the edge and `deleteEdges()` to remove it.

### addEdge

Creates a connection between two pins.

```json
{"action": "addEdge", "params": {
  "sourceTitle": "Delay",
  "sourcePin": "Completed",
  "targetTitle": "Print String",
  "targetPin": "execute"
}}
```

| Param | Type | Description |
|-------|------|-------------|
| `sourceTitle` | string | Source node's display title |
| `sourcePin` | string | Source pin display name |
| `targetTitle` | string | Target node's display title |
| `targetPin` | string | Target pin display name |

Resolves titles to IDs, then delegates to `GraphAPI.addEdge()` which validates direction, category compatibility, self-connections, and duplicates.

### addNode

Adds a new node by looking up a function in the signature database (2,756 UE functions).

```json
{"action": "addNode", "params": {
  "memberName": "PrintString",
  "position": {"x": 400, "y": 200}
}}
```

| Param | Type | Description |
|-------|------|-------------|
| `memberName` | string | UE function name (e.g., `"Delay"`, `"PrintString"`, `"K2_SetActorLocation"`) |
| `position` | `{x, y}` | Canvas position for the new node |

Delegates to `GraphAPI.addNodeFromSignature()`. All pins, properties, and metadata are populated automatically from the signature DB.

### setPinValue

Sets a pin's default value.

```json
{"action": "setPinValue", "params": {
  "nodeTitle": "Delay",
  "pinName": "Duration",
  "value": "2.0"
}}
```

| Param | Type | Description |
|-------|------|-------------|
| `nodeTitle` | string | Node's display title |
| `pinName` | string | Pin's display name |
| `value` | string | New default value |

### setNodeTitle

Renames a node's display title.

```json
{"action": "setNodeTitle", "params": {
  "nodeTitle": "Print String",
  "newTitle": "Debug Log"
}}
```

| Param | Type | Description |
|-------|------|-------------|
| `nodeTitle` | string | Current display title |
| `newTitle` | string | New display title |

### duplicateNode

Creates a copy of a node offset by (20, 20) with fresh GUIDs.

```json
{"action": "duplicateNode", "params": {"nodeTitle": "Print String"}}
```

| Param | Type | Description |
|-------|------|-------------|
| `nodeTitle` | string | Display title of the node to duplicate |

### annotateNode

Adds, updates, or removes a text annotation displayed above a node.

```json
{"action": "annotateNode", "params": {"nodeTitle": "Delay", "text": "Wait 2 seconds before firing"}}
```

| Param | Type | Description |
|-------|------|-------------|
| `nodeTitle` | string | Display title of the node to annotate |
| `text` | string | Annotation text (empty string removes annotation) |

### moveNode

Moves a node to a new position on the canvas.

```json
{"action": "moveNode", "params": {"nodeTitle": "Delay", "position": {"x": 500, "y": 300}}}
```

| Param | Type | Description |
|-------|------|-------------|
| `nodeTitle` | string | Display title of the node to move |
| `position` | `{x, y}` | New canvas position |

### addComment

Adds a comment node to the graph.

```json
{"action": "addComment", "params": {"text": "Main game loop", "position": {"x": 0, "y": -100}, "width": 400, "height": 200}}
```

| Param | Type | Description |
|-------|------|-------------|
| `text` | string | Comment text |
| `position` | `{x, y}` | Canvas position |
| `width` | number | Optional width (default 300) |
| `height` | number | Optional height (default 150) |

## Title-to-ID resolution

All AI commands use `nodeTitle` to identify nodes, since the AI sees graph titles in its context window, not internal IDs. Resolution works as follows:

1. `findNodesByTitle(title)` searches all nodes (case-insensitive substring match)
2. If multiple matches, prefer an **exact match** (case-insensitive)
3. Otherwise, return the **first match**
4. If no match, return an error: `Node "..." not found`

This means if you have two nodes titled "Print String" and "Print String 2", asking to delete "Print String" will match the first one exactly.

## Batch execution

All commands in a single AI response execute as an **atomic batch** with one undo snapshot:

```ts
// In ai-commands.ts:
api.captureSnapshot('AI commands');
for (const cmd of cmdResponse.commands) {
  executeSingleCommand(api, cmd);
}
```

Pressing Ctrl+Z after an AI modification undoes the entire set of commands in one step.

## Example conversations

### Rewiring nodes

**User:** "Disconnect BeginPlay from Print String and connect it to Delay instead"

**AI response:**
~~~json
```json
{
  "commands": [
    {"action": "addEdge", "params": {"sourceTitle": "Event BeginPlay", "sourcePin": "then", "targetTitle": "Delay", "targetPin": "execute"}}
  ],
  "explanation": "Connected BeginPlay's exec output to Delay's input."
}
```
~~~

### Adding and configuring a node

**User:** "Add a Delay node at position 400,200 and set its duration to 5 seconds"

**AI response:**
~~~json
```json
{
  "commands": [
    {"action": "addNode", "params": {"memberName": "Delay", "position": {"x": 400, "y": 200}}},
    {"action": "setPinValue", "params": {"nodeTitle": "Delay", "pinName": "Duration", "value": "5.0"}}
  ],
  "explanation": "Added a Delay node with 5-second duration."
}
```
~~~

### Cleanup operations

**User:** "Delete the Print String and Debug Print nodes"

**AI response:**
~~~json
```json
{
  "commands": [
    {"action": "deleteNode", "params": {"nodeTitle": "Print String"}},
    {"action": "deleteNode", "params": {"nodeTitle": "Debug Print"}}
  ],
  "explanation": "Removed both print nodes from the graph."
}
```
~~~

## Parsing

`parseAICommands(aiResponse)` extracts the JSON block from the AI's response text:

```ts
import { parseAICommands } from '../api/ai-commands';

const result = parseAICommands(aiResponseText);
if (result) {
  // result.commands: AICommand[]
  // result.explanation?: string
} else {
  // No command block found — treat as analyst response
}
```

Returns `null` if no ` ```json ``` ` block is found, if JSON parsing fails, if there is no `commands` array, or if the block looks like a `UEGraphJSON` (has a `nodes` array).

## Execution

```ts
import { executeAICommands } from '../api/ai-commands';

const cmdResponse = parseAICommands(aiText);
if (cmdResponse) {
  const result = executeAICommands(api, cmdResponse);
  // result.allSucceeded: boolean
  // result.explanation: string | undefined
  // result.results: CommandExecResult[] — per-command success/failure
}
```

## See Also

- [GraphAPI Overview](./GraphAPI-Overview.md) -- architecture and command pattern
- [Batch and Undo](./GraphAPI-Batch-and-Undo.md) -- how batch undo works
- [Node Operations](./GraphAPI-Node-Operations.md) -- `addNodeFromSignature` details
- [Edge Operations](./GraphAPI-Edge-Operations.md) -- connection validation rules
