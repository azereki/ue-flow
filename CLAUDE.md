# ue-flow

## Project Structure
- `js/` — React/Vite app (TypeScript, @xyflow/react)
- `python/` — Python renderer wrapper, outputs HTML/PNG
- `schema/` — JSON schema for UE graph data
- `examples/` — mock-render.html for visual testing
- `python/ue_flow/assets/ue-flow.iife.js` — built JS bundle consumed by Python renderer

## Build & Test
- `cd js && npm run build` — build JS bundle (also produces IIFE for Python)
- `cd js && npx vitest run` — run all tests (16 tests across 2 suites)
- Mock render: serve repo root via HTTP (`npx serve .`) then open `/examples/mock-render.html` (file:// blocked by CORS)
- Validation cycle: `cd js && npm run build && npx vitest run` — always run both after changes (build catches TS errors, tests catch logic errors)
- IIFE bundle at `python/ue_flow/assets/ue-flow.iife.js` is auto-built by `vite.config.ts` — no manual copy needed

## Key Architecture
- Nodes: `BlueprintNode.tsx` renders header + pin columns; `PinHandle.tsx` renders individual pins with React Flow `<Handle>`
- Edges: `BlueprintEdge.tsx` with custom path routing
- Theme: `js/src/theme/ue-flow.css` — all visual styling (Blueprint Noir dark theme)
- Types: `js/src/types/ue-graph.ts` (UEPin, UENode, UEEdge), `pin-types.ts` (PinCategory, PIN_COLORS)
- Transform: `json-to-flow.ts` (UE JSON → React Flow), `flow-to-t3d.ts` (React Flow → UE T3D paste text)
- Hooks: `js/src/hooks/useTabNavigation.ts` — tab/breadcrumb/navigation state for MultiGraphView
- Shared utils: `pin-types.ts` exports `classifyPinType()` for mapping type strings → PinCategory
- Python CLI: `python/ue_flow/cli.py` — `ue-flow render` subcommand (argparse)
- Python errors: `python/ue_flow/exceptions.py` — `UEFlowError` hierarchy (ParseError, RenderError, LayoutError, SerializationError)

## CSS/React Flow Gotchas
- `clip-path` clips `border` and `box-shadow` — use `filter: drop-shadow()` or `::after` pseudo-elements for glows on clipped shapes
- `.ueflow-node` uses `overflow: visible` so handles protrude past node edges (data pins as half-circles, exec pins as arrows)
- React Flow handles use `transform: translate(-50%, -50%)` for centering — never override with `transform: none`
- Exec pins use invisible Handle + `::after` pseudo-element with `clip-path: path()` for rounded arrow shapes
- `isConnectable={false}` on all handles — viewer mode, no user-drawn connections
- `backdrop-filter` on parent elements (e.g. comment nodes) frosts child content too — restrict to header-only elements that don't overlap node bodies
- Design tokens (`--uf-chrome-bg`, `--uf-subtle-border`, `--uf-text-secondary`, etc.) defined in `:root` — always use tokens, never hardcode colors/transitions
- Edge glow uses `filter: drop-shadow()` — suppressed at low zoom via `PinBodyContext` to avoid 200+ SVG filter ops per paint

## Conventions
- Commit style: `feat(ue-flow):` / `fix(ue-flow):` prefix
- CSS class prefix: `ueflow-` (e.g., `ueflow-node`, `ueflow-handle--exec`)
- Pin colors defined in `PIN_COLORS` map in `pin-types.ts`

## Python Parser (t3d_json.py)
- `_infer_title()` uses `_FRIENDLY_TITLES` dict + property-based inference — add new node titles there
- `_CLASS_TO_TYPE` maps UE class suffixes → semantic types (event, branch, cast, etc.) — extend when adding node types
- `auto_layout` exported from `__init__.py` for programmatic graph layout
