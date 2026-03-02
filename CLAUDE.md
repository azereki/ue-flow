# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ue-flow is an open-source UE Blueprint rendering suite. It takes Unreal Engine T3D paste text and renders interactive Blueprint graphs using React Flow, either as self-contained HTML or PNG screenshots.

## Project Structure
- `js/` — React/Vite app (TypeScript, @xyflow/react v12, React 19)
- `js/scripts/` — Build scripts (paste-tool generator)
- `python/` — Python renderer wrapper, outputs HTML/PNG
- `schema/` — JSON schema for UE graph data (`ue-graph.schema.json`)
- `examples/` — mock-render.html for visual testing, paste-tool.html for standalone paste-to-render
- `python/ue_flow/assets/ue-flow.iife.js` — built JS bundle consumed by Python renderer

## Build & Test
- `npm run build` — build JS bundle, copy IIFE to `python/ue_flow/assets/`, regenerate `examples/paste-tool.html`
- `npm test` — run Vitest unit tests (transform logic, T3D parsing, round-trip fidelity)
- `npm run test:e2e` — run Playwright e2e smoke tests (auto-starts http-server on port 4173)
- `npm run dev` — start Vite dev server with hot reload (shows paste landing page)
- All root `npm` commands proxy into `js/` via `--prefix` — you can also run directly with `cd js && npm run ...`
- Validation cycle: `npm run build && npm test` — always run both after changes (build catches TS errors, tests catch logic errors)
- Vitest excludes `e2e/` dir (configured in `vite.config.ts`) — Playwright specs use their own runner
- Vitest tests cover transform logic; Playwright tests cover rendering/interaction — visual CSS bugs need Playwright, not Vitest
- Paste tool: open `examples/paste-tool.html` directly in a browser (no server needed) — self-contained HTML with inlined IIFE bundle, auto-regenerated on `npm run build`
- Mock render: serve repo root via HTTP (`npx serve . -p 3335`) then open `/examples/mock-render.html` (file:// blocked by CORS)
- Python tests: `cd python && pip install -e ".[dev]" && python -m pytest`

## Data Pipeline

The end-to-end flow has two directions:

**T3D paste text → interactive HTML (rendering) — Python CLI path:**
1. Python `t3d_parser.py` parses raw T3D into `BlueprintGraph` model (`t3d_models.py`)
2. Python `t3d_json.py` serializes model → `UEGraphJSON` / `UEMultiGraphJSON` (the JSON schema)
3. Python `renderer.py` / `renderer_multi.py` embeds JSON + IIFE bundle into self-contained HTML
4. JS `main.tsx` reads JSON from `<script id="ue-flow-data">` or `ue-flow-multi-data` elements
5. JS `json-to-flow.ts` transforms UE JSON → React Flow nodes/edges with layout sizing
6. React Flow renders the interactive graph

**T3D paste text → interactive render — client-side path (no CLI):**
1. User pastes T3D text into `PasteLanding.tsx` textarea (or drags `.txt` file)
2. JS `t3d-to-json.ts` parses T3D directly to `UEGraphJSON` (port of Python parser + serializer)
3. `App.tsx` passes parsed graph to `SingleGraphView` for rendering
4. "New Paste" button returns to paste landing for another graph

**React Flow → T3D paste text (export / round-trip):**
1. JS `flow-to-t3d.ts` transforms React Flow nodes/edges → T3D clipboard text
2. Users can paste back into UE editor

## Key Architecture — JS (`js/src/`)

- **App modes:** `App.tsx` switches between `PasteLanding` (no data, paste T3D to render), `SingleGraphView` (one graph, full viewport), and `MultiGraphView` (sidebar + tabs + details panel + breadcrumbs). Embedded JSON takes precedence over pasted graphs
- **Nodes:** `BlueprintNode.tsx` renders header + pin columns; `PinHandle.tsx` renders individual pins with React Flow `<Handle>`; `CommentNode.tsx` renders transparent comment blocks; `NodeHeader.tsx` renders the colored header bar
- **Edges:** `BlueprintEdge.tsx` uses `getSmoothStepPath` with `borderRadius: 16` for UE-style right-angled wire routing — do NOT switch to `getBezierPath` (produces messy curves)
- **Theme:** `js/src/theme/ue-flow.css` — all visual styling (Blueprint Noir dark theme)
- **Types:** `ue-graph.ts` (UEPin, UENode, UEEdge, UEGraphJSON, UEMultiGraphJSON), `pin-types.ts` (PinCategory, PIN_COLORS), `flow-types.ts` (typed React Flow aliases)
- **Transform:** `json-to-flow.ts` (UE JSON → React Flow with node size estimation), `flow-to-t3d.ts` (React Flow → UE T3D paste text), `t3d-to-json.ts` (raw T3D paste text → UEGraphJSON, client-side port of Python parser)
- **Hooks:** `useTabNavigation.ts` — tab/breadcrumb/navigation state for MultiGraphView; `useUndoRedo.ts` — undo/redo with snapshot history
- **Shared utils:** `pin-types.ts` exports `classifyPinType()` for mapping type strings → PinCategory; `utils/selectors.ts` for shared React Flow store selectors
- **PinBodyContext** — single `useStore(zoomSelector)` in `PinBodyProvider` gates pin body rendering and edge glow (threshold: `zoom >= 0.15`). Consume this context for zoom-dependent rendering — do not create new store subscriptions
- **`window.ueFlowFitView()`** is exposed for the Python PNG renderer — do not remove or rename
- **Build:** Vite library mode produces self-contained IIFE; a custom `cssInjectedByJsPlugin` in `vite.config.ts` inlines CSS into the JS bundle; fonts are base64-inlined (5MB asset limit)
- **E2e:** `js/e2e/smoke.spec.ts` — Playwright smoke tests; config at `js/playwright.config.ts` auto-starts `http-server` on port 4173 serving the repo root

## Key Architecture — Python (`python/ue_flow/`)

- **Models:** `t3d_models.py` — `BlueprintGraph`, `BlueprintNode`, `BlueprintPin`, `PinDirection`, `PinCategory` dataclasses
- **Parser:** `t3d_parser.py` — `parse_paste_text()` converts raw T3D → `BlueprintGraph`
- **Serializer:** `t3d_serializer.py` — `serialize_graph()` converts `BlueprintGraph` → T3D text
- **JSON bridge:** `t3d_json.py` — `serialize_graph_to_json()` converts `BlueprintGraph` → dict matching `UEGraphJSON` schema; `_infer_title()` uses `_FRIENDLY_TITLES` dict + property-based inference; `_CLASS_TO_TYPE` maps UE class suffixes → semantic types
- **Layout:** `t3d_layout.py` — `auto_layout()` for programmatic graph positioning
- **Renderer:** `renderer.py` — `render_html()` / `render_png()` for single graphs; `renderer_multi.py` — `render_multi_html()` for multi-graph blueprints
- **Analysis:** `graph_analysis.py` — `summarize()` for graph summary; `graph_ops.py` — `validate_graph`, `set_pin_values`, `query_graph`, `diff_graphs`
- **CLI:** `cli.py` — `ue-flow render <input.txt> <output.html|png>` subcommand (argparse)
- **Errors:** `exceptions.py` — `UEFlowError` hierarchy (ParseError, RenderError, LayoutError, SerializationError)

## CSS/React Flow Gotchas
- `clip-path` clips `border` and `box-shadow` — use `filter: drop-shadow()` or `::after` pseudo-elements for glows on clipped shapes
- `.ueflow-node` uses `overflow: visible` so handles protrude past node edges — this is load-bearing; switching to `overflow: hidden` clips all handles
- React Flow handles use `transform: translate(-50%, -50%)` for centering — never override with `transform: none`
- Exec pins use invisible Handle + `::after` pseudo-element with `clip-path: path()` for rounded arrow shapes. All exec pin visual shape lives in `::after` — do not add visual styles to the Handle element itself
- `isConnectable={false}` on all handles — viewer mode, no user-drawn connections
- `backdrop-filter` only frosts elements painted before it in stacking order — confine to header elements only (not wrappers or pseudo-elements); `backdrop-filter` on sidebar/topbar/statusbar is a no-op (nothing interesting behind chrome panels to blur)
- Comment nodes use `zIndex: -2000` so `elevateNodesOnSelect` (+1000) still keeps them below regular nodes (0). During drag, comment bumps to `zIndex: 500`, children to `zIndex: 2000` — reset both on drag stop
- Comment block grouping uses bounding-box drag tracking in `App.tsx` — do NOT use React Flow `parentId` (makes child positions relative, breaking layout)
- Design tokens (`--uf-chrome-bg`, `--uf-subtle-border`, `--uf-text-secondary`, etc.) defined in `:root` — always use tokens, never hardcode colors/transitions
- Layout constants in `json-to-flow.ts` (`NODE_HEADER_HEIGHT`, `PIN_ROW_HEIGHT`, etc.) must stay in sync with CSS values
- Edge glow uses `filter: drop-shadow()` — suppressed at low zoom via `PinBodyContext` to avoid 200+ SVG filter ops per paint
- Node header glass uses `color-mix(in srgb, var(--header-accent) 25%, rgba(...))` — do not reintroduce `backdrop-filter` on node headers
- Do not use `100vw`/`100vh` on elements that receive CSS `zoom` — use `100%` and let a non-zoomed ancestor hold viewport units
- Example HTML files embed the IIFE inline — they go stale after rebuilds. Regenerate with the Python renderer or extract JSON + inject latest IIFE

## Conventions
- Commit style: `feat(ue-flow):` / `fix(ue-flow):` prefix
- CSS class prefix: `ueflow-` (e.g., `ueflow-node`, `ueflow-handle--exec`) — all class names unified under this prefix
- CSS variable prefix: `--uf-` (e.g., `--uf-bg`, `--uf-text`, `--uf-accent`) — shorter prefix for design tokens. The two systems intentionally use different prefixes
- Pin colors defined in `PIN_COLORS` map in `pin-types.ts`
- Design direction: intentionally diverge from stock UE Blueprint visuals — "feel better and distinguishable," not strict UE fidelity
