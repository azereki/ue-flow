# ue-flow — Next Round Implementation Plan

> **Date:** 2026-03-01
> **Sources:** React specialist (18 items), UI designer (32 items), Game developer (34 items)
> **Total unique items:** ~70 (after deduplication)

---

## ~~Sprint 1 — Critical Correctness & Contrast (P1 trivials)~~ DONE

> **Committed:** `d4d927b` — 2026-03-01

**Goal:** Fix bugs and WCAG violations that are one-line changes. Single commit.
**Effort:** ~1 hour
**Files:** `ue-flow.css`, `pin-types.ts`, `flow-to-t3d.ts`, `t3d_json.py`, `useUndoRedo.ts`

| ID | Source | Description | File(s) |
|----|--------|-------------|---------|
| T-01 | Game | T3D boolean capitalization: `false`→`False`, `true`→`True` | `flow-to-t3d.ts` |
| React-P1B | React | Undo keyboard handler fires inside form fields — guard on INPUT/TEXTAREA/SELECT | `useUndoRedo.ts` |
| P-01 | Game | Enum/byte pin color split: `byte: '#005f5f'`, `enum: '#00858C'` | `pin-types.ts` |
| P-02 | Game | Struct base color too dark: `#003259`→`#005080` | `pin-types.ts` |
| UI-P1-01 | UI | Node text colors bypass tokens — use `var(--uf-text)` not `#e0e0e8` | `ue-flow.css` |
| UI-P1-02 | UI | Inactive tab `#888` fails 4.5:1 — bump to `var(--uf-text-muted)` | `ue-flow.css` |
| UI-P1-03/04 | UI | Section headers `#888` fails contrast — use `var(--uf-text-muted)` | `ue-flow.css` |
| UI-P1-05 | UI | Non-clickable sidebar `#9aa` — use `var(--uf-text-secondary)` | `ue-flow.css` |
| F-03 | Game | `K2Node_ForEachLoopWithBreak` not mapped — add as `"foreach"` | `t3d_json.py` |
| N-01 | Game | DoOnce/Gate/FlipFlop/MultiGate → `"branch"`/`"sequence"` + friendly titles | `t3d_json.py` |
| N-02 | Game | InputAction/InputAxis/EnhancedInputAction → `"event"` type | `t3d_json.py` |
| PY-02 | Game | Add friendly titles: "Do Once", "Gate", "FlipFlop", "MultiGate" | `t3d_json.py` |

---

## ~~Sprint 2 — Token Sweep (CSS-only pass)~~ DONE

> **Committed:** `ba3cfa6` — 2026-03-01

**Goal:** Replace all remaining hardcoded hex colors with design tokens. WCAG compliance.
**Effort:** ~1.5 hours
**Files:** `ue-flow.css` (primary), `Sidebar.tsx`, `DetailsPanel.tsx`, `NodeHeader.tsx`

| ID | Source | Description | File(s) |
|----|--------|-------------|---------|
| UI-P2-03 | UI | Advanced toggle `#777`/`#aaa` → tokens | `ue-flow.css` |
| UI-P2-04 | UI | Pin default hint `#777` + `opacity:0.7` — remove opacity, use token | `ue-flow.css` |
| UI-P2-05 | UI | Pin value `#aab` → `var(--uf-text-secondary)` | `ue-flow.css` |
| UI-P2-06 | UI | Search input focus `#4a4a8a` → `var(--uf-accent)` (2 places) | `ue-flow.css` |
| UI-P2-07 | UI | Field input left-border `#4a6080` → accent token mix | `ue-flow.css` |
| UI-P2-08 | UI | Replication badge colors — define semantic tokens, fix contrast | `ue-flow.css` |
| UI-P2-09 | UI | Details kind badge `#1a1a3a` → `var(--uf-surface)` | `ue-flow.css` |
| UI-P2-10 | UI | Sidebar hover `#1a1a3a` → `var(--uf-surface-hover)` | `ue-flow.css` |
| UI-P2-11 | UI | Scrollbar thumb `#444` → bump for contrast | `ue-flow.css` |
| UI-P2-13 | UI | Resize handle hover `#2a2a4a` → token | `ue-flow.css` |
| UI-P3-07 | UI | Container badge `#999` → `var(--uf-text-muted)` | `ue-flow.css` |
| UI-P3-08 | UI | Segmented control `#777` → `var(--uf-text-muted)` | `ue-flow.css` |
| UI-P3-09 | UI | Param expand arrow `#777` → `var(--uf-text-muted)` | `ue-flow.css` |
| UI-P2-02 | UI | Export `TYPE_COLORS` from NodeHeader, import in MiniMap | `NodeHeader.tsx`, `App.tsx` |
| UI-P3-10 | UI | Tree connector inline style → CSS class | `Sidebar.tsx` |
| UI-P3-11 | UI | Delegate signature inline opacity → CSS class | `DetailsPanel.tsx` |
| React-P3E | React | NodeHeader fallback `#3060a0` → use `TYPE_COLORS.call_function` | `NodeHeader.tsx` |
| UI-P2-01 | UI | Minimap backdrop-filter → solid background | `ue-flow.css` |

---

## ~~Sprint 3 — React Architecture Fixes (P1-P2)~~ DONE

> **Committed:** `4fab4a5` — 2026-03-01

**Goal:** Fix performance bugs and state management issues.
**Effort:** ~2-3 hours
**Files:** `BlueprintNode.tsx`, `App.tsx`, `DetailsPanel.tsx`, `json-to-flow.ts`, `useUndoRedo.ts`, `TabBar.tsx`, `useTabNavigation.ts`

| ID | Source | Description | File(s) |
|----|--------|-------------|---------|
| React-P1A | React | `useConnectedPins` returns new Set every tick — use equality comparator or string key | `BlueprintNode.tsx` |
| React-P1C | React | Comment auto-pad mutates flow nodes in place — use immutable spread | `json-to-flow.ts` |
| React-P1D | React | DetailsPanel edits silently discarded — add "read-only" warning or `onEdit` callback | `DetailsPanel.tsx`, `App.tsx` |
| React-P2A | React | `nodesWithCallback` memo iterates all nodes every drag frame — inject via ref | `App.tsx` |
| React-P2B | React | InputPinRow local `editedValue` desynchronizes after undo — sync from prop | `BlueprintNode.tsx`, `useUndoRedo.ts` |
| React-P2C | React | `handleNodeDragStart` uses closure-captured nodes, not nodesRef | `App.tsx` |
| React-P2F | React | Array index as key in DetailsPanel — use `p.name`/`f.name` | `DetailsPanel.tsx` |
| React-P2G | React | Resize listeners leak on unmount — add cleanup via AbortController | `App.tsx` |
| React-P2D | React | TabBar no overflow handling — add `overflow-x: auto` | `TabBar.tsx`, `ue-flow.css` |
| React-P2E | React | `useTabNavigation` bundles stable+volatile in one useMemo — split | `useTabNavigation.ts` |

---

## ~~Sprint 4 — UE Fidelity: Visual Rendering (P1-P2)~~ DONE

> **Committed:** `a1302e1` — 2026-03-01
> N-03, N-04, N-05 were pre-completed in `fc3e024`. P-03 was already implemented in earlier sprints.

**Goal:** Improve visual accuracy vs real UE5 Blueprint editor.
**Effort:** ~2-3 hours
**Files:** `ue-flow.css`, `NodeHeader.tsx`, `PinHandle.tsx`, `BlueprintEdge.tsx`, `BlueprintNode.tsx`, `json-to-flow.ts`, `flow-types.ts`, `t3d_json.py`

| ID | Source | Description | File(s) |
|----|--------|-------------|---------|
| F-01 | Game | Exec pin input arrows mirror — input chevron points left, output points right | `ue-flow.css` |
| F-02 | Game | Timeline node: `K2Node_Timeline` → `"timeline"` type + yellow-orange header | `t3d_json.py`, `NodeHeader.tsx`, `ue-flow.css` |
| F-04 | Game | Pure function badge: larger (13px), green (#4ae04a), full opacity | `NodeHeader.tsx`, `ue-flow.css` |
| F-05 | Game | Variable getter/setter: tint header accent from pin type color | `json-to-flow.ts`, `flow-types.ts`, `NodeHeader.tsx`, `BlueprintNode.tsx` |
| F-07 | Game | Comment title: remove `text-transform: uppercase`, reduce to 16px | `ue-flow.css` |
| E-01 | Game | Edge selected state: brighter stroke (45% lighten) + stronger glow | `BlueprintEdge.tsx` |
| P-03 | Game | Array/reference/set pin shape differentiation | *(already implemented)* |
| P-04 | Game | `isWeak` (soft pointer) pins: dashed border | `PinHandle.tsx`, `ue-flow.css` |
| N-03 | Game | ComponentBoundEvent/ActorBoundEvent → `"event"` | `t3d_json.py` *(fc3e024 + a1302e1)* |
| N-04 | Game | Delegate operation nodes → `"delegate_*"` types | `t3d_json.py` *(fc3e024)* |
| N-05 | Game | `K2Node_ClassDynamicCast` → `"cast"` | `t3d_json.py` *(fc3e024)* |
| N-06 | Game | `K2Node_PromotableOperator` → `"call_function"` for compact math | `t3d_json.py` |

---

## ~~Sprint 5 — A11y Interactive Fixes + Tab Pattern~~ DONE

> **Committed:** `5a6a73e` — 2026-03-01

**Goal:** Complete ARIA patterns and keyboard navigation.
**Effort:** ~1.5 hours
**Files:** `TabBar.tsx`, `DetailsPanel.tsx`, `CommentNode.tsx`, `App.tsx`

| ID | Source | Description | File(s) |
|----|--------|-------------|---------|
| UI-P1-06 | UI | TabBar: roving tabindex, Left/Right/Home/End arrow nav, `aria-controls` | `TabBar.tsx` |
| UI-P3-06 | UI | TypeDot: add `title`, `aria-label`, and `role="img"` for pin type | `DetailsPanel.tsx` |
| UI-P3-12 | UI | Tab bar: add `aria-label="Open graphs"`, close button uses display name | `TabBar.tsx` |
| React-P3F | React | CommentNode title uses `role="heading" aria-level={3}` for screen reader nav | `CommentNode.tsx` |
| *(extra)* | — | Graph container gets `role="tabpanel"` + `aria-label` to match tab `aria-controls` | `App.tsx` |

---

## ~~Sprint 6 — T3D Round-Trip Completeness~~ DONE

> **Committed:** `ac4ef3f` — 2026-03-01

**Goal:** Fix serialization correctness for UE paste-back.
**Effort:** ~2-3 hours
**Files:** `flow-to-t3d.ts`, `ue-graph.ts`, `t3d_json.py`, `t3d_models.py`

| ID | Source | Description | File(s) |
|----|--------|-------------|---------|
| T-02 | Game | Emit `AutogeneratedDefaultValue` — add field to UEPin, serialize | `flow-to-t3d.ts`, `ue-graph.ts` |
| T-03 | Game | Emit `ExportPath` for nodes — thread assetPath through | `flow-to-t3d.ts`, `ue-graph.ts` |
| T-05 | Game | Comment T3D: emit `MoveMode`, `FontSize`, `bCommentBubblePinned` | `flow-to-t3d.ts` |
| PY-01 | Game | InputAction/InputAxis title inference from properties | `t3d_json.py` |
| PY-03 | Game | Pin `description` field — add to BlueprintPin, serialize | `t3d_json.py`, `t3d_models.py` |
| PY-04 | Game | Edge source/target key asymmetry fix | `t3d_json.py` |

---

## ~~Sprint 7 — Design Token Formalization + Polish~~ DONE

> **Committed:** `9dddc69` — 2026-03-01

**Goal:** Complete the design token system and polish gaps.
**Effort:** ~2 hours
**Files:** `ue-flow.css`, `App.tsx`

| ID | Source | Description | File(s) |
|----|--------|-------------|---------|
| UI-P3-02 | UI | Add `--uf-text-xl: 24px` to `:root` + reference in comment title | `ue-flow.css` |
| UI-P3-03 | UI | Chrome height tokens: `--uf-topbar-h`, `--uf-statusbar-h`, etc. | `ue-flow.css` |
| UI-P3-04 | UI | Border-radius tokens: `--uf-radius-node`, `--uf-radius-pill` | `ue-flow.css` |
| UI-P3-05 | UI | Export toolbar transition → use `--uf-transition` token | `ue-flow.css` |
| UI-P2-14 | UI | Vector axis color tokens `--uf-axis-x/y/z` + text labels | `ue-flow.css` |
| UI-P2-12 | UI | In-graph empty state: icon + subtitle + card treatment | `App.tsx`, `ue-flow.css` |
| UI-P3-01 | UI | Watermark responsive to `--uf-scale` | `ue-flow.css` |

---

## ~~Sprint 8 — Backlog Sweep + Bug Fixes~~ DONE

> **Committed:** TBD — 2026-03-01
> Items React-P3A, React-P3G, PY-05 were already completed in prior sprints.

**Goal:** Clear the P3 backlog via parallel agent team + fix navigation/sizing regressions.
**Effort:** ~2 hours
**Files:** `BlueprintNode.tsx`, `PinHandle.tsx`, `Sidebar.tsx`, `BlueprintEdge.tsx`, `ue-flow.css`, `flow-to-t3d.ts`, `ue-graph.ts`, `t3d_json.py`, `App.tsx`

| ID | Source | Description | File(s) | Status |
|----|--------|-------------|---------|--------|
| React-P3A | React | PinHandle className trailing spaces — use filter-join | `PinHandle.tsx` | *(already done)* |
| React-P3B | React | Reroute `pins.find` called twice inline | `BlueprintNode.tsx` | DONE |
| React-P3C | React | `formatDefaultHint` creates new pin object per render | `PinHandle.tsx` | DONE |
| React-P3D | React | Sidebar search has no debounce (matters at 500+ items) | `Sidebar.tsx` | DONE |
| React-P3G | React | DetailsPanel useEffect dep should be `[item]` not `[item.name, item.kind]` | *(already done)* | *(already done)* |
| E-02 | Game | Exec/data edge stroke ratio closer to UE (3:2 not 4:2.5) | `BlueprintEdge.tsx` | DONE |
| E-03 | Game | Edge hover: cursor pointer + stroke-width bump | `ue-flow.css` | DONE |
| P-05 | Game | `isConst` pins: tinted border | `PinHandle.tsx`, `ue-flow.css` | DONE |
| P-06 | Game | Default hint `= ` prefix: strip for numeric types | `PinHandle.tsx` | DONE |
| PY-05 | Game | Parse `PinToolTip` for pin descriptions | `t3d_json.py` | *(already done)* |
| PY-06 | Game | `K2Node_Tunnel` title inference (Inputs/Outputs) | `t3d_json.py` | DONE |
| T-04 | Game | PinSubCategoryMemberReference parsing | `ue-graph.ts`, `flow-to-t3d.ts`, `t3d_json.py` | DONE |
| F-06 | Game | Select node pin count indicator | `BlueprintNode.tsx`, `ue-flow.css` | DONE |
| BUG-01 | User | FitViewOnMount blocks re-focus after initial mount — sidebar click doesn't navigate | `App.tsx` | DONE |
| BUG-02 | User | Details panel resets to max-content on every item change | `App.tsx` | DONE |

---

## Remaining Backlog

| ID | Source | Description |
|----|--------|-------------|
| React-39 | Eval | React Compiler evaluation |

All other backlog items have been completed across sprints 1-8.
