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

## Key Architecture
- Nodes: `BlueprintNode.tsx` renders header + pin columns; `PinHandle.tsx` renders individual pins with React Flow `<Handle>`
- Edges: `BlueprintEdge.tsx` with custom path routing
- Theme: `js/src/theme/ue-flow.css` — all visual styling (Blueprint Noir dark theme)
- Types: `js/src/types/ue-graph.ts` (UEPin, UENode, UEEdge), `pin-types.ts` (PinCategory, PIN_COLORS)
- Transform: `json-to-flow.ts` (UE JSON → React Flow), `flow-to-t3d.ts` (React Flow → UE T3D paste text)

## CSS/React Flow Gotchas
- `clip-path` clips `border` and `box-shadow` — use `filter: drop-shadow()` or `::after` pseudo-elements for glows on clipped shapes
- `.ueflow-node` uses `overflow: visible` so handles protrude past node edges (data pins as half-circles, exec pins as arrows)
- React Flow handles use `transform: translate(-50%, -50%)` for centering — never override with `transform: none`
- Exec pins use invisible Handle + `::after` pseudo-element with `clip-path: path()` for rounded arrow shapes
- `isConnectable={false}` on all handles — viewer mode, no user-drawn connections

## Conventions
- Commit style: `feat(ue-flow):` / `fix(ue-flow):` prefix
- CSS class prefix: `ueflow-` (e.g., `ueflow-node`, `ueflow-handle--exec`)
- Pin colors defined in `PIN_COLORS` map in `pin-types.ts`
