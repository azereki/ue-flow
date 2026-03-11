# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ue-flow is an open-source UE Blueprint rendering suite. It takes Unreal Engine T3D paste text and renders interactive Blueprint graphs using React Flow, either as self-contained HTML or PNG screenshots.

## Project Structure
- `js/` — React/Vite app (TypeScript, @xyflow/react v12, React 19)
- `js/scripts/` — Build scripts (paste-tool generator, `export-signatures.py` extracts UE function signatures)
- `js/public/` — Static assets (`ue-signatures.json` — 2,756 UE functions, 6,345 pins from 23 core classes)
- `js/src/data/` — Demo data files (`demo-graph.ts` for hero, `demo-multigraph.ts` for full Blueprint demo)
- `js/src/components/LandingPage.tsx` — Marketing landing page with hero demo, showcase section, feature cards, paste CTA
- `python/` — Python renderer wrapper, outputs HTML/PNG
- `schema/` — JSON schema for UE graph data (`ue-graph.schema.json`)
- `examples/` — mock-render.html for visual testing, paste-tool.html for standalone paste-to-render
- `python/ue_flow/assets/ue-flow.iife.js` — built JS bundle consumed by Python renderer
- `.github/workflows/pages.yml` — CI workflow: build, unit tests, Python tests, lint, E2E (Playwright), bundle size check
- `wrangler.toml` — Cloudflare Pages deployment config

## Build & Test
- `npm run build` — build JS bundle, copy IIFE to `python/ue_flow/assets/`, regenerate `examples/paste-tool.html`
- `npm test` — run Vitest unit tests (transform logic, T3D parsing, round-trip fidelity)
- `npm run test:e2e` — run Playwright e2e tests (28 specs across 7 files, auto-starts http-server on port 4173)
- `npm run lint` — ESLint 9 + typescript-eslint + react-hooks
- `npm run format:check` — Prettier check
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

**Natural language → Blueprint generation (AI path):**
1. User describes logic in chat (e.g. "Generate a health regen system")
2. `useAIChat` uses hybrid prompt — analyst base (`ANALYST_SYSTEM_PROMPT`) always present, `GENERATE_SCHEMA_ADDENDUM` appended when `isGenerationRequest()` detects generation intent (two-tier: strong signals always trigger, weak signals suppressed by question anti-patterns)
3. AI returns UEGraphJSON in a ` ```json ``` ` code block
4. `parseGeneratedGraph()` extracts, validates, and normalizes the JSON
5. `GeneratePreview` renders a contained ReactFlow preview with Insert/Open New/Discard
6. On accept: `offsetGraphPositions()` shifts nodes right of existing content, merges into graph state

## Key Architecture — JS (`js/src/`)

- **App modes:** `App.tsx` switches between `LandingPage` (no data — hero demo, showcase, paste CTA), `SingleGraphView` (one graph, full viewport + floating chat FAB), `MultiGraphView` (sidebar + tabs + details panel + docked chat panel + breadcrumbs), and demo mode (loads `DEMO_MULTIGRAPH` into MultiGraphView). Embedded JSON takes precedence over pasted graphs, demo mode is toggled via "Explore Demo Blueprint" button on landing page
- **Mobile layout (≤768px):** MultiGraphView switches from IDE layout to mobile overlays — sidebar becomes a slide-in drawer (hamburger in TopBar), DetailsPanel becomes a bottom sheet, ChatPanel goes full-screen, StatusBar is hidden. All overlays use backdrop + click-to-close. CSS media queries at 900px/768px/600px/480px handle progressive enhancement for landing page, paste landing, touch targets. At ≤600px, landing page reorders via CSS `order`: hero header → how-it-works steps → paste box → showcase → features (hero graph hidden, step/try headings hidden). Sections use `.ueflow-landing-howto` and `.ueflow-landing-features-section` classes for CSS targeting
- **Landing page:** `LandingPage.tsx` — hero with live 6-node demo graph, interactive "Full Blueprint Viewer" showcase (live ReactFlow rendering of EventGraph, clickable sidebar items that switch graphs and animate zoom-to-node, scroll zoom enabled), feature cards, how-it-works steps, paste CTA section. Key internal components: `ShowcaseInteractive` (stateful sidebar + graph switcher), `ShowcaseGraph` (keyed `ReactFlowProvider` wrapper), `ShowcaseFocuser` (zoom-to-node via `useReactFlow`)
- **Demo data:** `data/demo-graph.ts` (simple 6-node hero graph), `data/demo-multigraph.ts` (full BP_PlayerCharacter with 3 graphs, events, functions, variables, components, structs, delegates)
- **Nodes:** `BlueprintNode.tsx` renders header + pin columns; `PinHandle.tsx` renders individual pins with React Flow `<Handle>`; `CommentNode.tsx` renders transparent comment blocks; `NodeHeader.tsx` renders the colored header bar
- **Edges:** `BlueprintEdge.tsx` uses `getSmoothStepPath` with `borderRadius: 16` for UE-style right-angled wire routing — do NOT switch to `getBezierPath` (produces messy curves)
- **Theme:** `js/src/theme/ue-flow.css` — all visual styling (Blueprint Noir dark theme)
- **Types:** `ue-graph.ts` (UEPin, UENode, UEEdge, UEGraphJSON, UEMultiGraphJSON), `pin-types.ts` (PinCategory, PIN_COLORS), `flow-types.ts` (typed React Flow aliases)
- **Transform:** `json-to-flow.ts` (UE JSON → React Flow with node size estimation), `flow-to-t3d.ts` (React Flow → UE T3D paste text with hidden pin injection, GUID validation, comment dimension export), `t3d-to-json.ts` (raw T3D paste text → UEGraphJSON, client-side port of Python parser)
- **Signature DB:** `utils/signature-db.ts` — lazy-loaded UE function signature database (`ue-signatures.json`). `lookupFunction(memberName, memberParent?)` returns `FunctionSig` with pins, isPure, isLatent. `learnFromGraph()` learns from user-pasted T3D at runtime
- **Graph Validator:** `utils/graph-validator.ts` — post-generation validator using signature DB. Corrects wrong memberParent, fixes pin categories (float→real), fills missing defaults/subCategoryObject, adds missing pins from signatures, injects exec pins for impure functions
- **UE References:** `utils/ue-references.ts` — `synthesizeNodeProperties()` (hardcoded ~170 entries) and `synthesizeNodePropertiesWithDB()` (2,700+ functions via signature DB). `qualifyNodeClass()` expands short class names to full `/Script/BlueprintGraph.` paths
- **GraphAPI:** `api/graph-api.ts` — unified mutation layer for all graph changes (UI + AI). Class wrapping React Flow state with undo/redo (full-state snapshots, max 50). Methods: `deleteNodes`, `deleteEdges`, `duplicateNodes`, `addEdge`, `addNode`, `addNodeFromSignature`, `setPinValue`, `setNodeProperty`, `setNodeTitle`, `moveNodes`, `executeBatch`, `insertRerouteNode`, `pasteNodes`, `setNodeAnnotation`, `addDynamicPin`, `removeDynamicPin`. Query: `findNodesByTitle`, `getNode`, `getEdge`, `getConnectedPins`, `getSelectedNodeIds`. Auto-generates pins for `K2Node_DynamicCast` (cast nodes), `K2Node_BreakStruct`/`K2Node_MakeStruct` (from struct registry). Accessed via `useGraphAPI()` from `contexts/GraphAPIContext.tsx`
- **Connection Validator:** `api/connection-validator.ts` — `canConnect()` validates pin compatibility (direction, category with float↔real↔double compat, implicit type conversions via `canImplicitlyConvert()` incl. int64/double, wildcard with type locking via `effectiveCategory()`, no self-connections, no duplicates, struct subCategoryObject matching, enum subCategoryObject matching, data input auto-replacement via `replaces` field, exec output auto-replacement via `replaces` field, exec input allows multiple connections for flow convergence)
- **AI Commands:** `api/ai-commands.ts` — AI command protocol for incremental graph modification. `isCommandRequest()` detects modification intent, `parseAICommands()` parses command JSON, `executeAICommands()` resolves titles to IDs and executes. Commands: `deleteNode`, `deleteEdge`, `addEdge`, `addNode`, `setPinValue`, `setNodeTitle`, `duplicateNode`, `annotateNode`, `moveNode`, `addComment`. `COMMAND_SCHEMA_ADDENDUM` documents available commands for the AI
- **Context Menu:** `components/ContextMenu.tsx` — right-click menu on nodes (Duplicate, Delete, Add Note/Edit Note) and edges (Delete Connection). Uses React Flow's dedicated `onNodeContextMenu`/`onEdgeContextMenu`/`onPaneContextMenu` props (not generic `onContextMenu`) for reliable target discrimination
- **Node Palette:** `components/NodePalette.tsx` — searchable palette (Tab key or right-click canvas) with 2,700+ functions from signature DB + special entries (events, component events, enhanced input, flow control incl. ForLoop/WhileLoop/Timeline, delegates, spawning, variables, utility incl. Self/PrintString/IsValid, comments, reroute, 8 cast nodes, Break/Make for 12 UE structs)
- **Keyboard Shortcuts:** Delete/Backspace (delete selected), Ctrl+D (duplicate), Ctrl+Z / Ctrl+Shift+Z (undo/redo), Ctrl+C/V/X (copy/paste/cut), Ctrl+F (search), Ctrl+B (bookmarks), Tab (node palette), Q (straighten connections) — editing shortcuts disabled in embedded mode
- **Connection Drawing:** Users can drag from output handles to input handles to create edges. `isValidConnection` callback uses `canConnect()` for real-time validation with implicit type conversions and enum matching. `nodesConnectable={!embedded}` disables in embedded/showcase contexts
- **Search Panel:** `components/SearchPanel.tsx` — Ctrl+F overlay searching node titles, pin names, comment text, and pin default values across graphs. `useSearch.ts` hook provides search logic
- **Bookmarks Panel:** `components/BookmarkPanel.tsx` — Ctrl+B panel for saving/restoring named viewport locations with sessionStorage persistence. `useBookmarks.ts` hook manages bookmark state
- **Alignment Toolbar:** `components/AlignToolbar.tsx` — floating toolbar when 2+ nodes selected with align (left/right/top/bottom/center) and distribute (horizontal/vertical) buttons. `utils/alignment.ts` contains pure functions
- **Node Annotations:** `components/NodeAnnotation.tsx` — speech bubble notes above node headers with inline editing and remove button
- **Node Diagnostics:** `nodes/NodeBadge.tsx` — error/warning badges on nodes with tooltip messages. `utils/node-diagnostics.ts` checks for missing references and unreachable nodes
- **Dynamic Pins:** `nodes/DynamicPinButton.tsx` — "+" button for adding pins on Sequence, MakeArray, Select, operator, SwitchInteger, and MultiGate nodes. `utils/dynamic-pins.ts` manages config and pin generation
- **Type System Utils:** `utils/type-conversions.ts` (implicit type promotions + object hierarchy), `utils/enum-registry.ts` (8 common UE enums for validation + dropdown editors), `utils/struct-registry.ts` (12 UE structs for Break/Make node generation)
- **Clipboard:** `utils/clipboard.ts` — `serializeSelection()` and `deserializeClipboard()` with automatic ID/GUID remapping for copy-paste between graphs
- **Exec Graph Analysis:** `utils/exec-graph.ts` — `findExecRoots()`, `findReachableNodes()` (BFS), `traceExecPath()` for unreachable node detection and exec flow highlighting
- **Blueprint-Level Creation (Layer 5):** MultiGraphView lifts `multiGraph` to mutable state. Sidebar "+" buttons on Events/Functions/Variables sections create new items via `prompt()` dialogs. Functions also create empty graph entries. Session-only (T3D export is node-level)
- **AI Chat:** `ChatPanel.tsx` renders the chat UI (header, message list, thinking indicator, suggested prompts, textarea input, GeneratePreview overlay). `useAIChat.ts` hook manages AI API calls with three-tier intent detection: command mode (graph modification via `isCommandRequest()` + `COMMAND_SCHEMA_ADDENDUM`), generation mode (new graph via `isGenerationRequest()` + `GENERATE_SCHEMA_ADDENDUM`), analyst mode (questions only). Message history (last 10), selected-node context as user message prefix, command result display. `graph-context.ts` serializes UE graph data into compact text summaries (12K char cap) for the AI system prompt. Chat is docked in MultiGraphView (resizable right panel) and floating in SingleGraphView (FAB + overlay)
- **AI Generation:** `ai-generate.ts` contains `GENERATE_SCHEMA_ADDENDUM` (XML-tagged UEGraphJSON schema with grounding, 3 few-shot examples, split rules/constraints), `parseGeneratedGraph()` (extracts/validates JSON from AI response with 32-char hex GUID generation, GUID dedup, edge-pin cross-validation, empty pin rejection, DB-backed property synthesis, and signature DB validation), `normalizeGeneratedPin()` (fills UEPin defaults), `offsetGraphPositions()` (for merge placement). `GeneratePreview.tsx` renders a contained ReactFlow preview with Insert/Open New/Discard. `NodeExplainer.tsx` shows a floating explanation card for selected nodes (800ms debounce)
- **AI Result Modal:** `AIResultModal.tsx` supports clickable node links — `renderWithNodeLinks()` scans result text for known node titles and wraps them as navigation links
- **AI Provider:** Dual-provider architecture with Gemini (free) and OpenRouter (BYOK). `AIProviderContext.tsx` manages active provider selection, API keys, model selection, warning state, and `chatCompletion()` dispatch. `gemini.ts` handles Google Gemini API (free tier, 30 req/min) with `generationConfig` (temperature 1.0, maxOutputTokens 8192, topP 0.95) and relaxed `safetySettings` (BLOCK_ONLY_HIGH — prevents game dev term false positives). `openrouter.ts` handles OpenRouter (budget/standard/premium tiers, no free models). Users configure via `AISettings.tsx` popover with tabbed provider UI. Keys stored in session or localStorage based on "remember" preference. Status dot on settings button shows red (no key), green (connected), orange (last call errored)
- **Hooks:** `useTabNavigation.ts` — tab/breadcrumb/navigation state for MultiGraphView; `useAIChat.ts` — AI chat with hybrid prompt, three-tier intent detection (command → generation → analyst), selected-node context as user message prefix, and message management; `useAIAction.ts` — one-shot AI actions (document, review, search, node explain); `useIsMobile.ts` — matchMedia-based hook (768px breakpoint) for mobile-responsive layout switching; `useSearch.ts` — search hook for Ctrl+F panel; `useBookmarks.ts` — bookmark hook with sessionStorage persistence
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
- Handles use `isConnectable` based on context — enabled in interactive mode, disabled in embedded/showcase mode via `nodesConnectable={!embedded}`
- `backdrop-filter` only frosts elements painted before it in stacking order — confine to header elements only (not wrappers or pseudo-elements); `backdrop-filter` on sidebar/topbar/statusbar is a no-op (nothing interesting behind chrome panels to blur)
- Comment nodes use `zIndex: -2000` so `elevateNodesOnSelect` (+1000) still keeps them below regular nodes (0). During drag, comment bumps to `zIndex: 500`, children to `zIndex: 2000` — reset both on drag stop
- Comment block grouping uses bounding-box drag tracking in `App.tsx` — do NOT use React Flow `parentId` (makes child positions relative, breaking layout)
- Design tokens (`--uf-chrome-bg`, `--uf-subtle-border`, `--uf-text-secondary`, etc.) defined in `:root` — always use tokens, never hardcode colors/transitions
- Layout constants in `json-to-flow.ts` (`NODE_HEADER_HEIGHT`, `PIN_ROW_HEIGHT`, etc.) must stay in sync with CSS values
- Edge glow uses `filter: drop-shadow()` — suppressed at low zoom via `PinBodyContext` to avoid 200+ SVG filter ops per paint
- Node header glass uses `color-mix(in srgb, var(--header-accent) 25%, rgba(...))` — do not reintroduce `backdrop-filter` on node headers
- Do not use `100vw` — causes horizontal scrollbar when scrollbar is visible; use `100%` instead. `100dvh` is used alongside `100vh` as fallback for iOS address bar
- Do not use `100vh` on elements that receive CSS `zoom` — use `100%` and let a non-zoomed ancestor hold viewport units
- Example HTML files embed the IIFE inline — they go stale after rebuilds. Regenerate with the Python renderer or extract JSON + inject latest IIFE
- When swapping entire graph data in a ReactFlow instance, key the `ReactFlowProvider` (not just `ReactFlow`) — otherwise internal state (viewport, node store) persists from the previous graph
- Context menus: use React Flow's dedicated `onNodeContextMenu`/`onEdgeContextMenu`/`onPaneContextMenu` props — do NOT use generic `onContextMenu` (it fires for all targets and overrides dedicated handlers). Do NOT use bubble-phase event listeners for tracking when d3-zoom is active (it calls `stopImmediatePropagation()`)
- `SingleGraphView` must be wrapped in `<ReactFlowProvider>` — components like `ExportToolbar` that are siblings of `<ReactFlow>` need access to the zustand store

## Visual QA (Selenium)
- Selenium + Brave headless is available for taking screenshots during dev sessions
- Scripts at `js/.firecrawl/scratchpad/screenshot.py` (full page) and `screenshot-scroll.py` (scroll to element) and `screenshot-click.py` (click then screenshot)
- Usage: `python screenshot.py <url> [output.png]`, `python screenshot-scroll.py <url> <css-selector> [output.png]`
- Brave path: `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`
- Playwright MCP plugin requires Chrome (not installed) — use Selenium for browser automation instead

## Deployment
- **Production:** Cloudflare Pages at `ue-flow.pages.dev` — auto-deploys from GitHub via dashboard connection
- **CI:** `.github/workflows/pages.yml` runs build + tests on pushes to `main`/`dev` and PRs (no GitHub Pages deployment — that's handled by Cloudflare)
- **Cloudflare config:** `wrangler.toml` — build command `npm install --prefix js && npm run build:pages --prefix js`, output dir `js/dist-pages`

## Git Workflow
- **`main`** — production branch, deploys to Cloudflare Pages
- **`dev`** — development branch for staging changes before main
- Work directly on `dev` for iterating; merge to `main` when ready to deploy

## Conventions
- Commit style: `feat(ue-flow):` / `fix(ue-flow):` prefix
- CSS class prefix: `ueflow-` (e.g., `ueflow-node`, `ueflow-handle--exec`) — all class names unified under this prefix
- CSS variable prefix: `--uf-` (e.g., `--uf-bg`, `--uf-text`, `--uf-accent`) — shorter prefix for design tokens. The two systems intentionally use different prefixes
- Pin colors defined in `PIN_COLORS` map in `pin-types.ts`
- Design direction: intentionally diverge from stock UE Blueprint visuals — "feel better and distinguishable," not strict UE fidelity

## UE Data Accuracy Rules
All Blueprint data — demo, AI-generated, or user-created — must use real UE properties that produce valid T3D when exported. Never use fake/placeholder properties.

- **K2Node_Event** MUST have `EventReference: '(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")'` and `bOverrideFunction: 'True'` — without these, UE shows "Event None"
- **K2Node_CallFunction** MUST have `FunctionReference: '(MemberParent="...",MemberName="...")'` — without this, UE drops the function call entirely
- **K2Node_VariableGet/Set** MUST have `VariableReference: '(MemberName="VarName",bSelfContext=True)'`
- **K2Node_FunctionEntry/Result** MUST have `SignatureName` matching the function name
- **Math operators** (K2Node_PromotableOperator, K2Node_CommutativeAssociativeBinaryOperator) need FunctionReference from KismetMathLibrary
- Variable getter titles should be the variable name (e.g. `"Health"`), not `"Get Health"`
- Pin IDs in T3D must be 32-char uppercase hex-only (0-9, A-F) — non-hex pin IDs cause UE to silently drop ALL connections
- nodeGuids must be exactly 32-char uppercase hex (0-9, A-F) and unique across all nodes — both `parseGeneratedGraph()` and `flowToT3D()` enforce this with dedup
- Pure functions (math ops, comparisons) must NOT have exec pins — `graph-validator.ts` uses `isPure` from signature DB to decide
- Impure functions MUST have exec input/output pins — `graph-validator.ts` auto-injects them if missing
- `flow-to-t3d.ts` injects hidden `self` and `WorldContextObject` pins for K2Node_CallFunction, plus `LatentInfo` for latent functions (Delay, etc.)
- `AutogeneratedDefaultValue` is only emitted when explicitly set on the pin — no automatic mirroring from DefaultValue (preserves round-trip fidelity)
- Comment node dimensions export from `properties.sizeX/sizeY` as fallback when React Flow `initialWidth/initialHeight` aren't set
- Shared reference maps live in `js/src/utils/ue-references.ts` — add new entries there, not inline
- `synthesizeNodePropertiesWithDB()` (2,700+ functions via signature DB) fills missing properties — used in both AI generation and T3D export
- `parseGeneratedGraph()` runs a 4-layer validation pipeline: property synthesis → GUID dedup → edge-pin cross-validation → signature DB correction
- `graph-validator.ts` is the final safety net: corrects wrong memberParent, fixes pin categories, fills defaults, adds missing pins, injects exec pins
