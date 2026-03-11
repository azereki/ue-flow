# ue-flow

An open-source Unreal Engine 5 Blueprint rendering suite. Parses UE5 T3D clipboard paste text and renders interactive Blueprint graph visualizations as self-contained HTML files or PNG screenshots.

![Blueprint Renderer](examples/preview.png)

## Features

- **Interactive graph viewer** built on React Flow with pan, zoom, selection, and node drag
- **16+ semantic node types** with type-colored headers (events, functions, branches, variables, macros, casts, switches, reroutes, comments, and more)
- **18 pin categories** with distinct colors, plus extended sub-type colors for Vector, Rotator, Transform, LinearColor, GameplayTag, and others
- **Exec pin arrows** rendered via CSS `clip-path` with connected/disconnected states
- **Pin value editing** for bool, int, float, string, vector, color, and enum types with undo/redo
- **Multi-graph viewer** with closeable tabs, breadcrumb navigation, and sidebar with search
- **Details panel** with 8 property inspector views (event, function, variable, struct, delegate, datatable, component, macro)
- **Comment nodes** with custom UE color parsing, frosted glass effect, resize, and group-drag
- **Export toolbar** with T3D copy, file download, editor push, LLM context, and markdown export
- **Bi-directional editing** — edit pin values in the browser, export modified T3D back to UE
- **Self-contained HTML** output with all JS, CSS, and fonts inlined (no external dependencies)
- **Python CLI** for rendering T3D files to HTML or PNG from the command line
- **AI chat panel** with dual-provider support — free via Google Gemini or BYOK via OpenRouter with curated model selection
- **AI Blueprint generation** — describe logic in natural language, AI generates Blueprint nodes that render on canvas with preview modal
- **Selection-aware AI** — selected node context injected into AI prompts, dynamic suggested prompts, and one-shot node explanation cards
- **Clickable AI findings** — node titles in Review results become navigation links
- **Graph analysis** API for execution tracing, data dependencies, dead end detection, and diff
- **Node alignment toolbar** — align, distribute, and straighten selected nodes (Q key for wire straightening)
- **Search across graphs** — Ctrl+F full-text search over node titles, pin names, comments, and pin values
- **Bookmarks** — Ctrl+B to save and restore named viewport locations across graphs
- **Implicit type conversions** — int→real, byte→int, name→string, and UE object class hierarchy awareness
- **Enum registry** with 23+ common UE enums for dropdown pin editors and connection validation
- **Node diagnostics** — error/warning badges for missing references, unreachable nodes, and latent function clock icons
- **Wildcard pin type locking** — connecting to a wildcard pin locks sibling wildcards to the resolved type
- **Advanced pin editors** — enum dropdowns, rotator struct fields, vector/color pickers, bool checkboxes
- **Per-node annotations** — add notes above any node via right-click context menu
- **Copy-paste between graphs** — Ctrl+C/V/X with automatic ID remapping
- **Dynamic pin nodes** — "+" button on Sequence, MakeArray, Select, Switch, and operator nodes
- **Struct registry** with Break/Make palette entries for 23+ UE structs (Vector, Rotator, Transform, HitResult, Quat, DateTime, and more)
- **Context menu** — right-click nodes (Duplicate, Delete, Add Note) and edges (Delete Connection)
- **Node palette** — Tab key or right-click canvas to search 2,700+ UE functions, events, flow control, variables, casts, and structs
- **Connection drawing** with real-time validation — drag between pins to create edges
- **Export Selected** — export only selected nodes as T3D, or full graph
- **T3D Property Inspector** — raw key-value editing of UE node properties
- **Graph Statistics Panel** — node/edge counts, complexity score, unreachable node warnings
- **Execution flow visualization** — double-click event nodes to highlight exec chains
- **Guided tour** — 6-step interactive walkthrough for new users
- **Blueprint templates** — 8 quick-start scenarios (Health Regen, AI Patrol, Sprint+Stamina, etc.)
- **Offline node descriptions** for 52 common nodes (no AI required)
- **AI resilience** — request timeout, retry with backoff, offline detection, provider fallback
- **Multi-graph T3D import** — parse T3D into multi-graph view with auto-detected events/functions/variables
- **Graph diff view** — compare two graphs with added/removed/modified node visualization
- **Keyboard shortcut panel** — press `?` to see all shortcuts
- **~540 tests** across Python (215 pytest) and JavaScript (304 Vitest + 28 Playwright)

## Quick Start

### Python (CLI)

```bash
pip install ue-flow

# Render T3D paste text to interactive HTML
ue-flow render blueprint.txt output.html

# Render to PNG (requires playwright)
pip install ue-flow[png]
ue-flow render blueprint.txt output.png
```

### Python (Library)

```python
import ue_flow

# Parse T3D paste text
graph = ue_flow.parse(t3d_text)

# Render to HTML
ue_flow.render_html(t3d_text, "output.html")

# Serialize to JSON
json_data = ue_flow.to_json(graph)

# Analyze execution flow
summary = ue_flow.summarize(graph, format="context")

# Validate graph structure
issues = ue_flow.validate_graph(graph)

# Compare two graphs
diff = ue_flow.diff_graphs(graph_a, graph_b)
```

### JavaScript (Development)

```bash
cd js
npm install
npm run dev     # Start dev server
npm run build   # Production build (IIFE bundle)
npm test        # Run unit tests
```

## Architecture

```
T3D Paste Text  ->  Python Parser  ->  BlueprintGraph Model  ->  JSON  ->  React Flow Renderer
                    (t3d_parser.py)    (t3d_models.py)           (t3d_json.py)  (App.tsx)
```

Reverse path (browser export):
```
React Flow State  ->  flow-to-t3d.ts  ->  T3D Paste Text (clipboard / file / UE editor)
```

### Project Structure

```
js/                         React/Vite frontend (TypeScript, @xyflow/react)
  src/
    App.tsx                 Root: SingleGraphView + MultiGraphView
    components/             UI chrome (Sidebar, DetailsPanel, TabBar, TopBar, StatusBar, ContextMenu, NodePalette, SearchPanel, BookmarkPanel, AlignToolbar, etc.)
    nodes/                  BlueprintNode, CommentNode, NodeHeader, PinHandle, PinValueEditor, NodeBadge, NodeAnnotation, DynamicPinButton
    edges/                  BlueprintEdge (bezier with type-colored glow)
    hooks/                  useTabNavigation, useAIChat, useAIAction, useIsMobile, useSearch, useBookmarks, useFocusTrap, usePaletteHistory, useTour
    contexts/               GraphAPIContext, AIProviderContext, ToastContext, ConfirmContext, PinBodyContext
    api/                    graph-api.ts (GraphAPI), connection-validator.ts, ai-commands.ts
    ai/                     gemini.ts, openrouter.ts, ai-retry.ts (shared timeout/backoff)
    transform/              json-to-flow.ts (UE JSON -> React Flow), flow-to-t3d.ts (reverse), t3d-to-json.ts (T3D -> JSON)
    types/                  ue-graph.ts, pin-types.ts, flow-types.ts
    utils/                  graph-context.ts, ai-generate.ts, alignment.ts, type-conversions.ts, enum-registry.ts, struct-registry.ts, exec-graph.ts, dynamic-pins.ts, clipboard.ts, node-diagnostics.ts, node-descriptions.ts, graph-diff.ts, signature-db.ts, markdown.tsx
    theme/                  ue-flow.css (~4500 lines), self-hosted fonts (Geist, JetBrainsMono)
  e2e/                      Playwright tests (smoke, paste-flow, node-interaction, context-menu, copy-paste, export, mobile)
python/
  ue_flow/
    t3d_parser.py           T3D paste text parser (regex + state machine tokenizer)
    t3d_models.py           Data models: BlueprintGraph, BlueprintNode, BlueprintPin
    t3d_json.py             JSON serializer with type inference and title mapping
    t3d_serializer.py       T3D text serializer (inverse of parser)
    t3d_layout.py           Auto-layout engine (topological sort + BFS)
    renderer.py             Single-graph HTML/PNG renderer
    renderer_multi.py       Multi-graph HTML renderer + BlueprintManifest
    graph_analysis.py       Execution tracing, data dependencies, summarization
    graph_ops.py            Validation, batch edits, query, structural diff
    cli.py                  CLI entry point (ue-flow render)
    exceptions.py           UEFlowError hierarchy
    assets/                 Built IIFE JS bundle (auto-copied from js/dist/)
  tests/                    215 pytest tests
schema/
  ue-graph.schema.json      JSON Schema (Draft 2020-12) for graph data
examples/
  mock-render.html          Multi-graph visual testing fixture
  BP_PlayerCharacter.html   Real blueprint rendered example
```

## Node Types

| Type | Header Color | Description |
|------|-------------|-------------|
| `event` | Red (#B40000) | Event nodes (BeginPlay, Tick, custom events) |
| `call_function` | Blue (#1060A8) | Function calls |
| `function_entry` | Red | Function entry points |
| `function_result` | Red | Function return nodes |
| `branch` | Gray (#404040) | Branch/conditional nodes |
| `variable_get` | Green (#208050) | Variable getter (pill shape) |
| `variable_set` | Green | Variable setter (pill shape) |
| `macro` | Purple (#8020a0) | Macro instances |
| `cast` | Teal | Cast nodes |
| `switch` | Olive | Switch/select nodes |
| `comment` | Custom RGBA | Resizable comment blocks |
| `reroute` | Pin color | Minimal 16px routing dots |

## Pin Categories

18 pin types with distinct colors: `exec` (white), `bool` (dark red), `real`/`float` (green), `int` (cyan), `byte` (teal), `string` (magenta), `name` (purple), `text` (pink), `object` (blue), `class` (indigo), `struct` (navy), `enum` (teal), `interface` (yellow), `delegate` (coral), `softclass`, `softobject`, `wildcard` (gray).

Extended sub-type colors for: Vector (gold), Rotator (light blue), Transform (orange), LinearColor (white), Vector2D, Vector4, GameplayTag, FieldPath, int64, uint64, double.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected nodes/edges |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+D` | Duplicate selected nodes |
| `Ctrl+C` | Copy selected nodes |
| `Ctrl+V` | Paste copied nodes |
| `Ctrl+X` | Cut selected nodes |
| `Ctrl+F` | Search across graphs |
| `Ctrl+B` | Toggle bookmarks panel |
| `Tab` | Open node palette |
| `Q` | Straighten selected node connections |
| `?` | Show keyboard shortcut reference |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UE_BRIDGE_PORT` | `9848` | Editor bridge port for "Push to Editor" export |

## Testing

```bash
# JavaScript unit tests (304 tests)
cd js && npm test

# JavaScript e2e tests (28 Playwright specs)
cd js && npx playwright test

# Python tests (215 tests)
cd python && pytest tests/ -v

# Lint
cd js && npm run lint
```

## Building

```bash
cd js
npm run build    # Produces dist/ue-flow.iife.js + auto-copies to python/ue_flow/assets/
```

The IIFE bundle is fully self-contained: all JS, CSS, and fonts (woff2) are inlined. The Python renderer injects this bundle into an HTML template to produce standalone files with zero external dependencies.

## JSON Schema

The graph data format is defined in `schema/ue-graph.schema.json` (JSON Schema Draft 2020-12). Supports both single-graph (`UEGraphJSON`) and multi-graph (`UEMultiGraphJSON`) formats.

## License

MIT - See [LICENSE](LICENSE) for details.
