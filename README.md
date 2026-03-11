# ue-flow

An open-source Unreal Engine 5 Blueprint rendering suite. Parses UE5 T3D clipboard paste text and renders interactive Blueprint graph visualizations as self-contained HTML files or PNG screenshots.

![Blueprint Renderer](examples/preview.png)

## Features

### Rendering
- **16+ node types** with type-colored headers — events, functions, branches, variables, macros, casts, switches, reroutes, comments
- **18 pin categories** with distinct colors, plus extended sub-type colors (Vector, Rotator, Transform, LinearColor, GameplayTag, etc.)
- **Multi-graph viewer** with tabbed navigation, sidebar, details panel, and breadcrumbs
- **Self-contained HTML** — all JS, CSS, and fonts inlined; zero external dependencies
- **Python CLI** — render T3D to HTML or PNG from the command line

### Editing
- **Bi-directional** — edit pin values in-browser, export modified T3D back to UE
- **Node palette** — Tab or right-click canvas to search 2,700+ UE functions, events, structs, and casts
- **Connection drawing** with real-time type validation, implicit conversions (int→real, byte→int, etc.), and wildcard type locking
- **Copy-paste** (Ctrl+C/V/X) between graphs with automatic ID remapping
- **Dynamic pins** — add/remove pins on Sequence, MakeArray, Select, Switch, and operator nodes
- **Alignment toolbar** — align, distribute, and straighten (Q) selected nodes
- **Context menu** — right-click nodes (Duplicate, Delete, Add Note) or edges (Delete Connection)
- **Undo/redo** (Ctrl+Z / Ctrl+Shift+Z) with 50-level snapshot stack

### AI Assistant
- **Chat panel** with dual-provider support — free via Google Gemini or BYOK via OpenRouter
- **Blueprint generation** — describe logic in natural language, preview and insert generated nodes
- **Selection-aware** — selected node context in prompts, one-shot explanation cards, clickable node links in results
- **Resilient** — request timeout, retry with backoff, offline detection, provider fallback

### Analysis & Navigation
- **Search** (Ctrl+F) across node titles, pin names, comments, and pin values
- **Bookmarks** (Ctrl+B) — save and restore named viewport locations
- **Execution flow visualization** — highlight exec chains, dim unreachable nodes
- **Node diagnostics** — error/warning badges for missing references and unreachable nodes
- **Graph diff** — side-by-side comparison with added/removed/modified visualization
- **Graph statistics** — node/edge counts, complexity score, unreachable warnings

### UE Parity
- **23+ enum** and **23+ struct** registries for dropdown editors, connection validation, and Break/Make nodes
- **Signature DB** — 2,756 functions from 23 core UE classes with pin-level accuracy
- **T3D Property Inspector** — raw key-value editing of UE node properties
- **Multi-graph T3D import** — auto-detects events, functions, and variables

### Onboarding
- **Guided tour** — 6-step interactive walkthrough
- **8 Blueprint templates** — Health Regen, AI Patrol, Sprint+Stamina, and more
- **Offline node descriptions** for 52 common nodes

### Quality
- **~540 tests** — Python (215 pytest), JavaScript (304 Vitest + 28 Playwright E2E)
- **ESLint + Prettier** with CI enforcement

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
