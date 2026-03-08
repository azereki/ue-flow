# Changelog

## [0.3.0] - 2026-03-08

### Added

- Add natural language Blueprint generation — describe logic in chat, AI generates UEGraphJSON nodes that render on the canvas with preview modal for insert/open/discard
- Add `ai-generate.ts` with generation system prompt (schema docs + few-shot example), `parseGeneratedGraph()` JSON extractor/validator, `normalizeGeneratedPin()` default filler, and `offsetGraphPositions()` for merge placement
- Add `GeneratePreview` component with contained ReactFlow preview of generated graph, Insert into Graph / Open as New Graph / Discard buttons, and node/connection count summary
- Add generation detection in `useAIChat` via keyword heuristic — automatically uses generation prompt when message contains "generate", "create", "build", etc.
- Add selection-aware chat — selected node title injected into AI system prompt, dynamic suggested prompts ("What does [title] do?", "What connects to [title]?", "Trace execution from [title]")
- Add clickable node links in AI Review results — node titles in result text become navigation links with accent color and hover glow
- Add `NodeExplainer` floating card — one-shot AI explanation of selected node with 800ms debounce, dismisses on deselect/Escape
- Add generation-focused suggested prompts in chat panel: "Generate a health regen system", "Create a damage handler", "Build a simple timer"
- Add 13 Vitest tests for ai-generate parser, normalizer, offset, and round-trip through `graphJsonToFlow()`
- Add Google Gemini as free AI provider (30 req/min, no credit card required) with tabbed provider UI alongside OpenRouter BYOK
- Add `gemini.ts` API client with chat completion, Gemini-format message conversion, and config storage
- Add status dot indicator on AI Settings button — red (no key), green (connected), orange (warning/error)
- Add friendly 429 rate limit error messages instead of raw API JSON
- Add dual-provider `AIProviderContext` with active provider tracking, warning state, and automatic fallback

### Changed

- Remove free-tier OpenRouter models (unreliable rate limits) — free access now via Gemini provider
- Remove graph/function/variable count from TopBar (kept in StatusBar only)

## [0.2.0] - 2026-03-07

### Added

- Add AI chat panel powered by Puter.js with Claude Sonnet 4.6 for asking questions about rendered Blueprint graphs ([`7286966`][7286966])
- Add graph-to-text serializer (`graph-context.ts`) that converts UE graph data into compact text summaries for AI context, with 12K character cap and truncation ([`7286966`][7286966])
- Add `useAIChat` hook with Puter.js integration, 30-second timeout for auth hangs, and conversation history management ([`56b4ed3`][56b4ed3])
- Add `ChatPanel` component with suggested prompt chips, animated thinking indicator (bouncing dots), header status, and send button spinner ([`0950cc5`][0950cc5])
- Add docked resizable chat panel in MultiGraphView (240–500px, right side with drag handle) ([`7286966`][7286966])
- Add floating chat overlay with FAB toggle button in SingleGraphView ([`7286966`][7286966])
- Add chat toggle button (robot head icon) in TopBar for MultiGraphView ([`9649cb2`][9649cb2])
- Add Puter.js TypeScript declarations (`puter.d.ts`) for `puter.ai.chat()` with streaming overloads ([`7286966`][7286966])
- Add 10 Vitest tests for graph-context serializer covering structure, truncation, and multi-graph output ([`7286966`][7286966])

### Fixed

- Fix app shell viewport containment: use `height: 100vh` on `.ueflow-app-shell` so TopBar stays visible without breaking landing page scroll ([`b1ee37d`][b1ee37d])
- Fix AI chat "no response received" by using correct Puter.js model name (`claude-sonnet-4-6`) and handling Claude's array content format (`content[0].text`) ([`cc84069`][cc84069])
- Fix AI chat promise hanging forever on Puter auth by wrapping API calls with 30-second timeout and clear error messaging ([`56b4ed3`][56b4ed3])
- Fix stale message state in chat hook by replacing `setMessages` callback reads with synchronous `messagesRef` ([`0cea8fc`][0cea8fc])

## [0.1.0] - 2026-03-01

_First release._

### Added

- Add T3D paste text parser with regex tokenizer and bracket-aware state machine for pin fields ([`3e99964`][3e99964])
- Add data models for BlueprintGraph, BlueprintNode, and BlueprintPin with auto-generated GUIDs ([`3e99964`][3e99964])
- Add React/Vite frontend with Blueprint Noir dark theme and @xyflow/react renderer ([`02cc3db`][02cc3db])
- Add Python JSON serializer with class-to-type inference for 25+ UE node classes and friendly title mapping ([`6f9c9c4`][6f9c9c4])
- Add single-graph HTML renderer producing self-contained files with inlined JS, CSS, and fonts ([`6f9c9c4`][6f9c9c4])
- Add T3D text serializer with bidirectional link enforcement for round-trip editing ([`e3d6e1d`][e3d6e1d])
- Add flow-to-t3d.ts browser-side transform enabling T3D export from React Flow state ([`e3d6e1d`][e3d6e1d])
- Add multi-graph viewer with BlueprintManifest, closeable tabs, and breadcrumb navigation ([`39b1b22`][39b1b22])
- Add graph analysis API: execution tracing, data dependencies, dead end detection, and summarization in context/markdown/compact formats ([`127bae5`][127bae5])
- Add graph operations API: validate, set_pin_values, query, and structural diff ([`127bae5`][127bae5])
- Add parity test suite verifying node type mapping, pin color coverage, and round-trip integrity ([`f16c954`][f16c954])
- Add app shell chrome: TopBar, Sidebar with 8 collapsible sections, StatusBar, and TabBar ([`69b1ddc`][69b1ddc])
- Add node size estimation from pin count and label lengths for accurate initial layout ([`047b578`][047b578])
- Add CommentNode with custom UE color parsing (RGBA), resize handles, and frosted glass backdrop ([`f2cf164`][f2cf164])
- Add DetailsPanel with 8 property inspector views: event, function, variable, struct, delegate, datatable, component, macro ([`512ba6f`][512ba6f])
- Add sidebar search filtering across all sections simultaneously ([`251d47e`][251d47e])
- Add sidebar and details panel resize handles with drag interaction ([`251d47e`][251d47e])
- Add viewport culling, PinBodyContext single-zoom-subscription optimization, and edge glow suppression at low zoom ([`4d44db0`][4d44db0])
- Add exec pin arrows via CSS clip-path with connected/disconnected states and named exec labels ([`280df51`][280df51])
- Add pin tooltips displaying name, type, sub-type, container, reference/const status, and default value ([`280df51`][280df51])
- Add closeable tab system with pinned default tab and breadcrumb history tracking ([`cd3bf91`][cd3bf91])
- Add responsive viewport scaling relative to 1440px reference width (0.75x-1.5x range) ([`cd3bf91`][cd3bf91])
- Add comment group-drag: dragging a comment moves all enclosed nodes, with z-index elevation during drag ([`cd3bf91`][cd3bf91])
- Add "Flat Glass" visual design: glassmorphism on all UI surfaces with backdrop-filter blur and noise overlay ([`1f96b56`][1f96b56])
- Add design tokens as CSS custom properties (--uf-bg, --uf-surface, --uf-text, --uf-accent, etc.) ([`431841d`][431841d])
- Add accessibility features: skip navigation link, ARIA landmarks, focus-visible outlines, prefers-reduced-motion, prefers-contrast:more ([`431841d`][431841d])
- Add PinBodyContext provider lifting N per-node zoom subscriptions to a single provider ([`431841d`][431841d])
- Add ExportToolbar with T3D copy, file download, editor push, LLM context, and markdown export ([`431841d`][431841d])
- Add Python CLI entry point: `ue-flow render <input> <output>` ([`431841d`][431841d])
- Add UEFlowError exception hierarchy: ParseError, RenderError, LayoutError, SerializationError ([`431841d`][431841d])
- Add JSON Schema (Draft 2020-12) for UEGraphJSON and UEMultiGraphJSON validation ([`431841d`][431841d])
- Add classifyPinType() shared utility for mapping type strings to PinCategory ([`431841d`][431841d])
- Add Playwright e2e smoke tests: 5 tests covering node rendering, comment z-index, sidebar sections, tab state, export toolbar ([`9bbc8c8`][9bbc8c8])
- Add golden selection highlight replacing indigo border with UE5 gold (#ffa500) ([`0041cc5`][0041cc5])
- Add variable pill shape (rounded border-radius) for variable_get/set nodes ([`0041cc5`][0041cc5])
- Add canvas noise overlay via SVG fractalNoise texture ([`0041cc5`][0041cc5])
- Add details panel glass morphism with backdrop-filter and glass input styling ([`0041cc5`][0041cc5])
- Add self-hosted fonts: Geist (Regular, SemiBold) and JetBrainsMono Nerd Font (woff2) ([`0041cc5`][0041cc5])
- Add DataTableView and StructView components for tabbed data display ([`0041cc5`][0041cc5])
- Add useUndoRedo hook with Ctrl+Z / Ctrl+Shift+Z for node positions and pin values (50-snapshot stack) ([`0041cc5`][0041cc5])
- Add variable metadata fields: instanceEditable, exposeOnSpawn, private, transient, saveGame with schema, sidebar badges, and detail checkboxes ([`f3a41a7`][f3a41a7])
- Add extended pin type colors for 12 struct sub-types: Vector (gold), Rotator (light blue), Transform (orange), LinearColor, int64, double, GameplayTag, FieldPath ([`f3a41a7`][f3a41a7])
- Add inline default value hints on unconnected input pins ([`1d05192`][1d05192])
- Add advanced property toggle with connected-pin awareness (always show connected advanced pins) ([`1d05192`][1d05192])
- Add reference diamond and delegate rectangle pin connector shapes ([`1d05192`][1d05192])
- Add compact math operator nodes with COMPACT_TITLE_ICONS for 18 operators ([`1d05192`][1d05192])
- Add details panel resize handle mirroring sidebar resize pattern ([`0f00410`][0f00410])
- Add container type editors with summary badges and expandable element lists in details panel ([`0f00410`][0f00410])
- Add expandable parameter rows with recursive struct sub-field expansion for Vector, Rotator, Transform, and Color ([`0f00410`][0f00410])
- Add right-click panning through nodes by intercepting mousedown and re-dispatching on React Flow pane ([`0082ea8`][0082ea8])
- Add auto-sizing sidebars using max-content CSS measurement with useLayoutEffect pin-on-mount ([`0082ea8`][0082ea8])
- Add auto-layout engine with topological sort along exec flow and BFS positioning ([`3e99964`][3e99964])

### Fixed

- Fix CSS injection into IIFE bundle so HTML output is fully self-contained with no external stylesheet ([`caa68d1`][caa68d1])
- Fix sidebar visual quality: section spacing, item alignment, and search placeholder styling ([`d5f0b7f`][d5f0b7f])
- Fix crash when clicking events and functions in sidebar due to missing null guard ([`aa55103`][aa55103])
- Fix duplicate breadcrumbs appearing on repeated graph navigation ([`3a279c8`][3a279c8])
- Fix zoom-to-event with fuzzy title matching and setCenter for mismatched sidebar/graph titles ([`773196c`][773196c])
- Fix clipboard fallback textarea leak in ExportToolbar ([`308b8e7`][308b8e7])
- Fix PinValueEditor state desync when pin prop changes ([`308b8e7`][308b8e7])
- Fix 11 as-any casts with proper TypeScript types across components ([`308b8e7`][308b8e7])
- Fix sidebar resize callback instability with useRef ([`a1c6c58`][a1c6c58])
- Fix breadcrumb key from array index to graphName for stable rendering ([`a1c6c58`][a1c6c58])
- Fix PinHandle store selector to return boolean instead of full edges array, reducing re-renders ([`a1c6c58`][a1c6c58])
- Fix comment block z-ordering: zIndex -2000 base, elevation to z-500 on drag, children to z-2000 during drag ([`312341b`][312341b])
- Fix frosted glass on comment body during drag overlap with non-child nodes ([`312341b`][312341b])

### Changed

- Unify CSS class prefix from `uf-` to `ueflow-` across all components and stylesheet ([`2c26c47`][2c26c47])
- Lift isConnected pin state from per-pin store subscriptions to parent BlueprintNode prop for reduced re-renders ([`c0645d5`][c0645d5])
- Move Components section to top of sidebar for default layout ([`0082ea8`][0082ea8])
- Reduce segment button padding and field label min-width for compact details panel ([`0082ea8`][0082ea8])

[0.3.0]: https://github.com/azereki/ue-flow/releases/tag/v0.3.0
[0.2.0]: https://github.com/azereki/ue-flow/releases/tag/v0.2.0
[0.1.0]: https://github.com/azereki/ue-flow/releases/tag/v0.1.0

[0950cc5]: https://github.com/azereki/ue-flow/commit/0950cc5
[56b4ed3]: https://github.com/azereki/ue-flow/commit/56b4ed3
[0cea8fc]: https://github.com/azereki/ue-flow/commit/0cea8fc
[cc84069]: https://github.com/azereki/ue-flow/commit/cc84069
[b1ee37d]: https://github.com/azereki/ue-flow/commit/b1ee37d
[9649cb2]: https://github.com/azereki/ue-flow/commit/9649cb2
[7286966]: https://github.com/azereki/ue-flow/commit/7286966

[3e99964]: https://github.com/azereki/ue-flow/commit/3e99964
[02cc3db]: https://github.com/azereki/ue-flow/commit/02cc3db
[6f9c9c4]: https://github.com/azereki/ue-flow/commit/6f9c9c4
[e3d6e1d]: https://github.com/azereki/ue-flow/commit/e3d6e1d
[39b1b22]: https://github.com/azereki/ue-flow/commit/39b1b22
[127bae5]: https://github.com/azereki/ue-flow/commit/127bae5
[f16c954]: https://github.com/azereki/ue-flow/commit/f16c954
[caa68d1]: https://github.com/azereki/ue-flow/commit/caa68d1
[d5f0b7f]: https://github.com/azereki/ue-flow/commit/d5f0b7f
[ba0705b]: https://github.com/azereki/ue-flow/commit/ba0705b
[69b1ddc]: https://github.com/azereki/ue-flow/commit/69b1ddc
[047b578]: https://github.com/azereki/ue-flow/commit/047b578
[f2cf164]: https://github.com/azereki/ue-flow/commit/f2cf164
[512ba6f]: https://github.com/azereki/ue-flow/commit/512ba6f
[251d47e]: https://github.com/azereki/ue-flow/commit/251d47e
[4d44db0]: https://github.com/azereki/ue-flow/commit/4d44db0
[aa55103]: https://github.com/azereki/ue-flow/commit/aa55103
[3a279c8]: https://github.com/azereki/ue-flow/commit/3a279c8
[773196c]: https://github.com/azereki/ue-flow/commit/773196c
[b4bde12]: https://github.com/azereki/ue-flow/commit/b4bde12
[308b8e7]: https://github.com/azereki/ue-flow/commit/308b8e7
[a1c6c58]: https://github.com/azereki/ue-flow/commit/a1c6c58
[3261f67]: https://github.com/azereki/ue-flow/commit/3261f67
[cd3bf91]: https://github.com/azereki/ue-flow/commit/cd3bf91
[280df51]: https://github.com/azereki/ue-flow/commit/280df51
[1f96b56]: https://github.com/azereki/ue-flow/commit/1f96b56
[431841d]: https://github.com/azereki/ue-flow/commit/431841d
[9f7aeb3]: https://github.com/azereki/ue-flow/commit/9f7aeb3
[312341b]: https://github.com/azereki/ue-flow/commit/312341b
[9bbc8c8]: https://github.com/azereki/ue-flow/commit/9bbc8c8
[2c26c47]: https://github.com/azereki/ue-flow/commit/2c26c47
[0041cc5]: https://github.com/azereki/ue-flow/commit/0041cc5
[f3a41a7]: https://github.com/azereki/ue-flow/commit/f3a41a7
[1d05192]: https://github.com/azereki/ue-flow/commit/1d05192
[0f00410]: https://github.com/azereki/ue-flow/commit/0f00410
[0a3b011]: https://github.com/azereki/ue-flow/commit/0a3b011
[0082ea8]: https://github.com/azereki/ue-flow/commit/0082ea8
[c819ba6]: https://github.com/azereki/ue-flow/commit/c819ba6
[c0645d5]: https://github.com/azereki/ue-flow/commit/c0645d5
[73fc647]: https://github.com/azereki/ue-flow/commit/73fc647
