# Keyboard Shortcuts

All keyboard shortcuts available in ue-flow's interactive graph editor. Shortcuts marked with (E) are disabled in embedded/showcase mode.

## Editing

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Delete` / `Backspace` | Delete selected nodes and edges | Also removes connected edges (E) |
| `Ctrl+D` | Duplicate selected nodes | Offset +20px, fresh GUIDs, preserves internal wiring (E) |
| `Ctrl+C` | Copy selected nodes | Serializes nodes + interconnecting edges to clipboard (E) |
| `Ctrl+V` | Paste copied nodes | Remaps all IDs/GUIDs, inserts at cursor position (E) |
| `Ctrl+X` | Cut selected nodes | Copy + delete in one operation (E) |
| `Ctrl+Z` | Undo | Full-state snapshot restoration (max 50 levels) (E) |
| `Ctrl+Shift+Z` | Redo | Re-applies undone state (E) |
| `Q` | Straighten connections | Aligns selected target nodes to their source nodes' Y position (E) |

## Navigation & Panels

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Ctrl+F` | Toggle search panel | Full-text search across nodes, pins, comments; click result to navigate |
| `Ctrl+B` | Toggle bookmarks panel | Save/restore named viewport locations per graph |
| `Tab` | Open node palette | Searchable palette with 2,700+ UE functions, events, structs (E) |
| `?` | Shortcut reference panel | Shows all shortcuts by category in a modal |

## Canvas Interaction

| Shortcut | Action | Notes |
|----------|--------|-------|
| Scroll wheel | Zoom in/out | Centered on cursor position |
| Click + drag (canvas) | Pan viewport | Right-click panning also works through nodes |
| Click + drag (node) | Move node | Comment nodes also move enclosed nodes |
| Double-click (edge) | Insert reroute node | Creates a K2Node_Knot routing dot at the click position |
| Double-click (event node) | Execution flow visualization | Highlights exec chain, dims unreachable nodes |
| Right-click (node) | Context menu | Duplicate, Delete, Add Note / Edit Note |
| Right-click (edge) | Context menu | Delete Connection |
| Right-click (canvas) | Node palette | Same as Tab key |
| Drag (pin to pin) | Create connection | Real-time validation feedback |

## Alignment Toolbar

When 2 or more nodes are selected, a floating alignment toolbar appears with these actions:

| Button | Action |
|--------|--------|
| Align Left | Align selected nodes to leftmost edge |
| Align Right | Align selected nodes to rightmost edge |
| Align Top | Align selected nodes to topmost edge |
| Align Bottom | Align selected nodes to bottommost edge |
| Center H | Center selected nodes horizontally |
| Center V | Center selected nodes vertically |
| Distribute H | Evenly space selected nodes horizontally |
| Distribute V | Evenly space selected nodes vertically |

## Embedded Mode

When ue-flow is embedded via the embed API (`window.renderUEFlow()`), most editing shortcuts are disabled. The graph is view-only with pan and zoom. Connection drawing is also disabled (`nodesConnectable={false}`).

## See Also

- [GraphAPI Overview](./GraphAPI-Overview.md) -- undo/redo mechanics
- [GraphAPI Node Operations](./GraphAPI-Node-Operations.md) -- what deletion and duplication do internally
