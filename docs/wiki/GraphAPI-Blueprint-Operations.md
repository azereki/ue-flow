# GraphAPI Blueprint Operations

> **Status: Planned -- not yet implemented.**
>
> This page documents blueprint-level operations that are under consideration for future GraphAPI versions. These operations would manage constructs above the individual-node level: variables, custom events, functions, and components.

## Current state

Today, ue-flow's GraphAPI operates at the **node/edge level** within a single graph. Blueprint-level constructs (variables, custom events, functions, components) exist in the `UEMultiGraphJSON` data model and are rendered in the MultiGraphView sidebar.

Blueprint-level creation is now **partially implemented** via the MultiGraphView sidebar "+" buttons on Events, Functions, and Variables sections. These use `prompt()` dialogs to create new items (functions also create empty graph entries with FunctionEntry/FunctionResult nodes). These operations are **session-only** -- they exist in the client state for the current editing session but are not persisted to T3D or JSON export.

Additionally, struct Break/Make nodes are now available in the node palette via the struct registry (`struct-registry.ts`), enabling decomposition and construction of UE struct types.

Users can:
- View variables, events, functions, and components in the sidebar (populated from parsed T3D or demo data)
- Create new variables, custom events, and functions via sidebar "+" buttons (session-only)
- Navigate between sub-graphs (EventGraph, function graphs) via tabs
- Generate complete new graphs via the AI generation path (produces full `UEGraphJSON`)

Users cannot yet:
- Rename or delete blueprint-level constructs
- Add/remove components
- Persist blueprint-level changes to T3D export

## Planned operations

### Variable management (session-scoped)

```ts
// Planned API shape -- not yet implemented
api.addVariable({
  name: 'Health',
  category: 'real',        // PinCategory
  defaultValue: '100.0',
  replicates: false,
});

api.deleteVariable('Health');
api.renameVariable('Health', 'MaxHealth');
```

Variables would be session-only -- they exist in the client state for the current editing session and appear in the sidebar, but are not persisted to T3D or JSON export (since T3D paste text only describes graph content, not Blueprint class definitions).

### Custom event management

```ts
// Planned API shape -- not yet implemented
api.addCustomEvent({
  name: 'OnHealthChanged',
  pins: [
    { name: 'NewHealth', direction: 'output', category: 'real' },
  ],
});
```

Adding a custom event would create a `K2Node_CustomEvent` node in the EventGraph with the specified output pins, plus generate a corresponding `K2Node_CallCustomEvent` node that can be placed elsewhere.

### Function management

```ts
// Planned API shape -- not yet implemented
api.addFunction({
  name: 'CalculateDamage',
  isPure: false,
  inputs: [
    { name: 'BaseDamage', category: 'real' },
    { name: 'Multiplier', category: 'real', defaultValue: '1.0' },
  ],
  outputs: [
    { name: 'FinalDamage', category: 'real' },
  ],
});
```

This would create a new function sub-graph with `K2Node_FunctionEntry` and `K2Node_FunctionResult` nodes, register it in the MultiGraphView sidebar, and add a navigable tab.

## Design considerations

### Session-only vs. persistent

Blueprint-level constructs like variables and function definitions live in the `.uasset` binary, not in T3D paste text. Since ue-flow operates on T3D clipboard data, these constructs would be **session-only** -- useful for AI-assisted editing workflows but not exported back to UE.

### Integration with AI commands

The [AI Command Protocol](./AI-Command-Protocol.md) could be extended with actions like `addVariable`, `addCustomEvent`, and `addFunction`. These would follow the same title-based identification and batch execution patterns.

### MultiGraphView integration

New functions and custom events would need to:
- Register in the sidebar navigation
- Create new tab entries in `useTabNavigation`
- Initialize with starter nodes (FunctionEntry/FunctionResult for functions, CustomEvent for events)

## Current workarounds

For now, users can approximate these operations using existing capabilities:

**Creating a variable getter:** Use `addNode` with `K2Node_VariableGet`:

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

**Creating a custom event node:** Use `addNode` with `K2Node_CustomEvent`:

```ts
api.addNode({
  nodeClass: 'K2Node_CustomEvent',
  title: 'OnHealthChanged',
  position: { x: 0, y: 0 },
  pins: [
    { name: 'then', direction: 'output', category: 'exec' },
    { name: 'NewHealth', direction: 'output', category: 'real' },
  ],
});
```

These create the nodes but do not register them as blueprint-level constructs in the sidebar.

## See Also

- [GraphAPI Overview](./GraphAPI-Overview.md) -- current architecture
- [Node Operations](./GraphAPI-Node-Operations.md) -- `addNode` for creating event/variable nodes directly
- [AI Command Protocol](./AI-Command-Protocol.md) -- current command actions
