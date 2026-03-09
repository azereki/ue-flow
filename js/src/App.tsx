import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './theme/ue-flow.css';
import { graphJsonToFlow } from './transform/json-to-flow';
import { BlueprintNode } from './nodes/BlueprintNode';
import { TYPE_COLORS } from './nodes/NodeHeader';
import { BlueprintEdge } from './edges/BlueprintEdge';
import { CommentNode } from './nodes/CommentNode';
import { ExportToolbar } from './components/ExportToolbar';
import { TabBar } from './components/TabBar';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';
import { DetailsPanel, type DetailsItem } from './components/DetailsPanel';
import { PinBodyContext } from './contexts/PinBodyContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { UEGraphJSON, UEMultiGraphJSON } from './types/ue-graph';
import type { AnyFlowNode, BlueprintFlowEdge, BlueprintFlowNode, FlowNodeData } from './types/flow-types';
import { zoomSelector } from './utils/selectors';
import { useTabNavigation, parseTabName } from './hooks/useTabNavigation';
import { DataTableView } from './components/DataTableView';
import { StructView } from './components/StructView';
import { LandingPage } from './components/LandingPage';
import { ChatPanel } from './components/ChatPanel';
import { NodeExplainer } from './components/NodeExplainer';
import { DEMO_MULTIGRAPH } from './data/demo-multigraph';
import { serializeGraphContext, serializeMultiGraphContext } from './utils/graph-context';
import { offsetGraphPositions } from './utils/ai-generate';
import { useIsMobile } from './hooks/useIsMobile';
import { GraphAPI } from './api/graph-api';
import { GraphAPIProvider } from './contexts/GraphAPIContext';
import { canConnect } from './api/connection-validator';
import { ContextMenu, type ContextMenuAction } from './components/ContextMenu';
import { NodePalette } from './components/NodePalette';
import { AlignToolbar } from './components/AlignToolbar';
import { SearchPanel } from './components/SearchPanel';
import { BookmarkPanel } from './components/BookmarkPanel';
import { loadSignatureDB } from './utils/signature-db';
import { alignNodes, distributeNodes, straightenConnection, type AlignAxis, type DistributeAxis } from './utils/alignment';
import { serializeSelection, deserializeClipboard } from './utils/clipboard';
import { useSearch } from './hooks/useSearch';
import { useBookmarks } from './hooks/useBookmarks';

const nodeTypes = {
  blueprintNode: BlueprintNode,
  commentNode: CommentNode,
};
const edgeTypes = { blueprintEdge: BlueprintEdge };

interface AppProps {
  graphJSON: UEGraphJSON | null;
  multiGraphJSON?: UEMultiGraphJSON | null;
}

function FitViewOnMount({ focusNode, onReady }: { focusNode?: { x: number; y: number; w: number; h: number }; onReady?: () => void }) {
  const { fitView, setCenter } = useReactFlow();
  const isInitialMount = useRef(true);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (focusNode) {
        setCenter(
          focusNode.x + focusNode.w / 2,
          focusNode.y + focusNode.h / 2,
          { zoom: 1.0 },
        );
      } else if (isInitialMount.current) {
        fitView({ padding: 0.15, minZoom: 0.5, maxZoom: 1.5 });
      }
      isInitialMount.current = false;
      // Fire onReady after layout settles (second rAF ensures paint completed)
      if (onReady) {
        requestAnimationFrame(() => onReady());
      }
    });
    return () => cancelAnimationFrame(id);
  }, [focusNode, fitView, setCenter, onReady]);
  return null;
}

/** Expose window.ueFlowFitView() for external callers (e.g. Python PNG renderer). */
function ExposeGlobalFitView() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    (window as unknown as Record<string, unknown>).ueFlowFitView = () => {
      fitView({ padding: 0.15, minZoom: 0.5, maxZoom: 1.5 });
    };
    return () => { delete (window as unknown as Record<string, unknown>).ueFlowFitView; };
  }, [fitView]);
  return null;
}

function ZoomIndicator() {
  const zoom = useStore(zoomSelector);
  return <div className="ueflow-zoom-indicator">Zoom {Math.round(zoom * 100)}%</div>;
}

/** Provides PinBodyContext from a single zoom subscription (replaces N per-node subscriptions). */
function PinBodyProvider({ children }: { children: React.ReactNode }) {
  const zoom = useStore(zoomSelector);
  return <PinBodyContext.Provider value={zoom >= 0.15}>{children}</PinBodyContext.Provider>;
}

/** Exposes screenToFlowPosition via a ref for the parent component. */
function ExposeScreenToFlow({ screenToFlowRef }: { screenToFlowRef: React.MutableRefObject<((pos: { x: number; y: number }) => { x: number; y: number }) | null> }) {
  const { screenToFlowPosition } = useReactFlow();
  useEffect(() => {
    screenToFlowRef.current = screenToFlowPosition;
    return () => { screenToFlowRef.current = null; };
  }, [screenToFlowPosition, screenToFlowRef]);
  return null;
}

export interface DisplayOptions {
  showControls?: boolean;
  showMiniMap?: boolean;
  showExportToolbar?: boolean;
  showZoomIndicator?: boolean;
}

export function SingleGraphView({ graphJSON, focusNodeTitle, onSelectedNodeChange, embedded, displayOptions, onReady, graphAPI: externalGraphAPI, onNodeCreated }: { graphJSON: UEGraphJSON; focusNodeTitle?: string | null; onSelectedNodeChange?: (title: string | null) => void; embedded?: boolean; displayOptions?: DisplayOptions; onReady?: () => void; graphAPI?: GraphAPI; onNodeCreated?: (entry: { label: string; nodeClass: string }) => void }) {
  const initial = useMemo(() => graphJsonToFlow(graphJSON), [graphJSON]);
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyFlowNode>(initial.nodes);
  // useEdgesState is kept untyped because its OnEdgesChange generic is contravariant —
  // React Flow's internal edge changes produce base Edge objects which can't satisfy the
  // narrower BlueprintFlowEdge constraint at the handler level. We cast at usage sites.
  const [edgesRaw, setEdgesRaw, onEdgesChange] = useEdgesState(initial.edges);
  const edges = edgesRaw as BlueprintFlowEdge[];

  // Stable refs for GraphAPI access
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // Create or use external GraphAPI
  const graphAPIRef = useRef<GraphAPI | null>(externalGraphAPI ?? null);
  if (!graphAPIRef.current) {
    graphAPIRef.current = new GraphAPI(
      () => nodesRef.current,
      () => edgesRef.current,
      setNodes as (updater: (nodes: AnyFlowNode[]) => AnyFlowNode[]) => void,
      setEdgesRaw as unknown as (updater: (edges: BlueprintFlowEdge[]) => BlueprintFlowEdge[]) => void,
    );
  }
  const graphAPI = graphAPIRef.current;

  // Eagerly load signature DB for node palette
  useEffect(() => { loadSignatureDB(); }, []);

  // Pin value editing via GraphAPI
  const setPinValueRef = useRef((nodeId: string, pinId: string, value: string) => {
    graphAPI.setPinValue(nodeId, pinId, value);
  });
  const stableSetPinValue = useCallback(
    (nodeId: string, pinId: string, value: string) => { setPinValueRef.current(nodeId, pinId, value); },
    [],
  );

  // Attach __setPinValue to every blueprintNode's data.
  const nodesWithCallback = useMemo(() =>
    nodes.map((n) => {
      if (n.type !== 'blueprintNode') return n;
      const bp = n as BlueprintFlowNode;
      if (bp.data.__setPinValue === stableSetPinValue) return n;
      return { ...bp, data: { ...bp.data, __setPinValue: stableSetPinValue } };
    }),
    [nodes, stableSetPinValue],
  );

  // Resolve focus title to node position using stable initial data
  const focusNode = useMemo(() => {
    if (!focusNodeTitle) return undefined;
    const q = focusNodeTitle.toLowerCase();
    const target = initial.nodes.find((n) => {
      if (n.type !== 'blueprintNode') return false;
      const title = (n.data.title ?? '').toLowerCase();
      return title === q || title.includes(q) || title.replace('event ', '').replace('receive', '') === q;
    });
    if (!target) return undefined;
    return {
      x: target.position.x,
      y: target.position.y,
      w: target.initialWidth ?? 200,
      h: target.initialHeight ?? 100,
    };
  }, [focusNodeTitle, initial.nodes]);

  // Comment group-drag: when a comment node is dragged, move all enclosed nodes with it.
  const dragContext = useRef<{ childIds: Set<string>; commentId: string; lastPos: { x: number; y: number } } | null>(null);

  const handleNodeDragStart = useCallback((_: React.MouseEvent, node: AnyFlowNode) => {
    graphAPI.captureSnapshot('drag');
    if (node.type !== 'commentNode') return;
    const cx = node.position.x;
    const cy = node.position.y;
    const cw = node.initialWidth ?? 400;
    const ch = node.initialHeight ?? 200;
    const childIds = new Set<string>();
    for (const n of nodesRef.current) {
      if (n.id === node.id || n.type === 'commentNode') continue;
      const nw = n.initialWidth ?? 160;
      const nh = n.initialHeight ?? 42;
      const ncx = n.position.x + nw / 2;
      const ncy = n.position.y + nh / 2;
      if (ncx >= cx && ncx <= cx + cw && ncy >= cy && ncy <= cy + ch) {
        childIds.add(n.id);
      }
    }
    dragContext.current = { childIds, commentId: node.id, lastPos: { x: cx, y: cy } };
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === node.id) return { ...n, zIndex: 500 };
        if (childIds.has(n.id)) return { ...n, zIndex: 2000 };
        return n;
      }),
    );
  }, [setNodes, graphAPI]);

  const handleNodeDrag = useCallback((_: React.MouseEvent, node: AnyFlowNode) => {
    const ctx = dragContext.current;
    if (!ctx || node.type !== 'commentNode' || ctx.childIds.size === 0) return;
    const dx = node.position.x - ctx.lastPos.x;
    const dy = node.position.y - ctx.lastPos.y;
    if (dx === 0 && dy === 0) return;
    ctx.lastPos = { x: node.position.x, y: node.position.y };
    setNodes((prev) =>
      prev.map((n) =>
        ctx.childIds.has(n.id)
          ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
          : n,
      ),
    );
  }, [setNodes]);

  const handleNodeDragStop = useCallback(() => {
    const ctx = dragContext.current;
    if (ctx) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === ctx.commentId) return { ...n, zIndex: -2000 };
          if (ctx.childIds.has(n.id)) return { ...n, zIndex: undefined };
          return n;
        }),
      );
    }
    dragContext.current = null;
  }, [setNodes]);

  // ─── Context Menu & Node Palette ────────────────────────────────────────────

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, clearSearch } = useSearch(undefined, graphJSON);
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; edgeId?: string } | null>(null);
  const [nodePalette, setNodePalette] = useState<{ x: number; y: number; graphX: number; graphY: number } | null>(null);
  // screenToFlowPosition needs to be called from inside ReactFlow's context.
  // We store a ref that gets set by a child component.
  const screenToFlowRef = useRef<((pos: { x: number; y: number }) => { x: number; y: number }) | null>(null);

  // ─── Right-click context menu (stationary clicks only) ──────────────────────
  // Track right-mousedown position + max movement. The contextmenu event fires
  // after mouseup, so we measure total drag distance to distinguish click vs pan.
  // IMPORTANT: capture phase (true) so it fires BEFORE the rpan handler which
  // calls stopPropagation and would block bubble-phase listeners.
  const rclickDown = useRef<{ x: number; y: number; maxDist: number } | null>(null);
  const RCLICK_THRESHOLD = 5; // px — movement under this counts as stationary

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      rclickDown.current = { x: e.clientX, y: e.clientY, maxDist: 0 };
    };
    const onMove = (e: MouseEvent) => {
      if (!rclickDown.current) return;
      const dx = e.clientX - rclickDown.current.x;
      const dy = e.clientY - rclickDown.current.y;
      const dist = dx * dx + dy * dy;
      if (dist > rclickDown.current.maxDist) rclickDown.current.maxDist = dist;
    };
    // capture: true so this fires before rpan's capture-phase stopPropagation
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('mousemove', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('mousemove', onMove);
    };
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Prevent default browser context menu
    e.preventDefault();

    // If menu is already open, close it on any right-click
    if (contextMenu) {
      setContextMenu(null);
      rclickDown.current = null;
      return;
    }
    if (nodePalette) {
      setNodePalette(null);
      rclickDown.current = null;
      return;
    }

    // Only open on stationary right-click (no drag/pan)
    const wasDrag = rclickDown.current && rclickDown.current.maxDist > RCLICK_THRESHOLD * RCLICK_THRESHOLD;
    rclickDown.current = null;
    if (wasDrag) return;

    // Don't open context menu when right-clicking on pin handles (interferes with connections)
    const target = e.target as HTMLElement;
    if (target.closest('.ueflow-handle') || target.closest('.react-flow__handle')) return;

    // Check if right-clicked on a node
    const nodeEl = target.closest('.react-flow__node');
    const edgeEl = target.closest('.react-flow__edge');

    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-id');
      if (nodeId) {
        setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
        return;
      }
    }
    if (edgeEl) {
      const edgeId = edgeEl.getAttribute('data-testid')?.replace('rf__edge-', '') ?? undefined;
      if (edgeId) {
        setContextMenu({ x: e.clientX, y: e.clientY, edgeId });
        return;
      }
    }

    // Right-click on empty canvas → show node palette
    if (!embedded && screenToFlowRef.current) {
      const flowPos = screenToFlowRef.current({ x: e.clientX, y: e.clientY });
      setNodePalette({ x: e.clientX, y: e.clientY, graphX: flowPos.x, graphY: flowPos.y });
    }
  }, [embedded, contextMenu, nodePalette]);

  const contextMenuActions = useMemo((): ContextMenuAction[] => {
    if (!contextMenu) return [];
    if (contextMenu.nodeId) {
      const nodeId = contextMenu.nodeId!;
      const node = nodesRef.current.find((n) => n.id === nodeId);
      const hasAnnotation = node?.type === 'blueprintNode' && (node as BlueprintFlowNode).data.annotation;
      return [
        { label: 'Duplicate', shortcut: 'Ctrl+D', onClick: () => graphAPI.duplicateNodes([nodeId]) },
        {
          label: hasAnnotation ? 'Edit Note' : 'Add Note',
          onClick: () => {
            const text = prompt('Note:', hasAnnotation ? String(hasAnnotation) : '');
            if (text !== null) graphAPI.setNodeAnnotation(nodeId, text);
          },
        },
        { label: 'Delete', shortcut: 'Del', danger: true, onClick: () => graphAPI.deleteNodes([nodeId]) },
      ];
    }
    if (contextMenu.edgeId) {
      return [
        { label: 'Delete Connection', shortcut: 'Del', danger: true, onClick: () => graphAPI.deleteEdges([contextMenu.edgeId!]) },
      ];
    }
    return [];
  }, [contextMenu, graphAPI]);

  const handlePaletteSelect = useCallback((entry: { label: string; nodeClass: string; memberName?: string; memberParent?: string }) => {
    if (!nodePalette) return;
    const pos = { x: nodePalette.graphX, y: nodePalette.graphY };
    if (entry.memberName && entry.memberParent) {
      graphAPI.addNodeFromSignature(entry.memberName, pos);
    } else if (entry.memberName) {
      const result = graphAPI.addNodeFromSignature(entry.memberName, pos);
      if (!result.success) {
        graphAPI.addNode({ nodeClass: entry.nodeClass, title: entry.label, position: pos });
      }
    } else {
      graphAPI.addNode({ nodeClass: entry.nodeClass, title: entry.label, position: pos });
    }
    onNodeCreated?.({ label: entry.label, nodeClass: entry.nodeClass });
    setNodePalette(null);
  }, [nodePalette, graphAPI, onNodeCreated]);

  // ─── Alignment ─────────────────────────────────────────────────────────────

  const getSelectedRects = useCallback(() => {
    const nodes = nodesRef.current;
    return selectedNodeIds
      .map((id) => {
        const n = nodes.find((node) => node.id === id);
        if (!n || n.type === 'commentNode') return null;
        return { id: n.id, x: n.position.x, y: n.position.y, width: n.initialWidth ?? 160, height: n.initialHeight ?? 80 };
      })
      .filter(Boolean) as Array<{ id: string; x: number; y: number; width: number; height: number }>;
  }, [selectedNodeIds]);

  const handleAlign = useCallback((axis: AlignAxis) => {
    const rects = getSelectedRects();
    if (rects.length < 2) return;
    graphAPI.captureSnapshot('align');
    const moves = alignNodes(rects, axis);
    graphAPI.moveNodes(moves);
  }, [getSelectedRects, graphAPI]);

  const handleDistribute = useCallback((axis: DistributeAxis) => {
    const rects = getSelectedRects();
    if (rects.length < 3) return;
    graphAPI.captureSnapshot('distribute');
    const moves = distributeNodes(rects, axis);
    graphAPI.moveNodes(moves);
  }, [getSelectedRects, graphAPI]);

  const handleStraighten = useCallback(() => {
    const rects = getSelectedRects();
    if (rects.length !== 2) return;
    graphAPI.captureSnapshot('straighten');
    const moves = straightenConnection(rects[0], rects[1]);
    graphAPI.moveNodes(moves);
  }, [getSelectedRects, graphAPI]);

  // ─── Reroute insertion (double-click on edge) ──────────────────────────────

  const handleEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: BlueprintFlowEdge) => {
    if (embedded || !screenToFlowRef.current) return;
    // Insert reroute at mouse position (approximate: use edge midpoint as fallback)
    const sourceNode = nodesRef.current.find((n) => n.id === edge.source);
    const targetNode = nodesRef.current.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return;
    const midX = (sourceNode.position.x + targetNode.position.x) / 2;
    const midY = (sourceNode.position.y + targetNode.position.y) / 2;
    graphAPI.insertRerouteNode(edge.id, { x: midX, y: midY });
  }, [embedded, graphAPI]);

  // ─── Connection Drawing (Layer 2) ───────────────────────────────────────────

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;
    // Find the pin names from handle IDs
    const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
    const targetNode = nodesRef.current.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return;
    if (sourceNode.type !== 'blueprintNode' || targetNode.type !== 'blueprintNode') return;
    const srcPin = (sourceNode as BlueprintFlowNode).data.pins.find((p) => p.id === connection.sourceHandle);
    const tgtPin = (targetNode as BlueprintFlowNode).data.pins.find((p) => p.id === connection.targetHandle);
    if (!srcPin || !tgtPin) return;
    graphAPI.addEdge(connection.source, srcPin.name, connection.target, tgtPin.name);
  }, [graphAPI]);

  const handleIsValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return false;
    const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
    const targetNode = nodesRef.current.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;
    if (sourceNode.type !== 'blueprintNode' || targetNode.type !== 'blueprintNode') return false;
    const srcPin = (sourceNode as BlueprintFlowNode).data.pins.find((p) => p.id === connection.sourceHandle);
    const tgtPin = (targetNode as BlueprintFlowNode).data.pins.find((p) => p.id === connection.targetHandle);
    if (!srcPin || !tgtPin) return false;
    const result = canConnect(srcPin, tgtPin, connection.source, connection.target, edgesRef.current);
    return result.valid;
  }, []);

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    if (embedded) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ctrl+F — open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      // Ctrl+B — toggle bookmarks
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setBookmarksOpen((prev) => !prev);
        return;
      }

      // Ctrl+C — copy selected nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const ids = graphAPI.getSelectedNodeIds();
        if (ids.length > 0) {
          const json = serializeSelection(ids, nodesRef.current, edgesRef.current);
          navigator.clipboard?.writeText(json).catch(() => {
            sessionStorage.setItem('ueflow-clipboard', json);
          });
          sessionStorage.setItem('ueflow-clipboard', json);
        }
        return;
      }

      // Ctrl+V — paste nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        const pasteFromText = (text: string) => {
          if (!screenToFlowRef.current) return;
          const center = screenToFlowRef.current({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          const result = deserializeClipboard(text, center);
          if (result) graphAPI.pasteNodes(result.nodes, result.edges);
        };
        navigator.clipboard?.readText()
          .then(pasteFromText)
          .catch(() => {
            const fallback = sessionStorage.getItem('ueflow-clipboard');
            if (fallback) pasteFromText(fallback);
          });
        return;
      }

      // Ctrl+X — cut selected nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        const ids = graphAPI.getSelectedNodeIds();
        if (ids.length > 0) {
          const json = serializeSelection(ids, nodesRef.current, edgesRef.current);
          navigator.clipboard?.writeText(json).catch(() => {
            sessionStorage.setItem('ueflow-clipboard', json);
          });
          sessionStorage.setItem('ueflow-clipboard', json);
          graphAPI.deleteNodes(ids);
        }
        return;
      }

      // Ctrl+Z / Ctrl+Shift+Z — undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) graphAPI.redo();
        else graphAPI.undo();
        return;
      }

      // Delete / Backspace — delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const selectedNodeIds = graphAPI.getSelectedNodeIds();
        const selectedEdgeIds = graphAPI.getSelectedEdgeIds();
        if (selectedNodeIds.length > 0) graphAPI.deleteNodes(selectedNodeIds);
        else if (selectedEdgeIds.length > 0) graphAPI.deleteEdges(selectedEdgeIds);
        return;
      }

      // Ctrl+D — duplicate selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const selectedNodeIds = graphAPI.getSelectedNodeIds();
        if (selectedNodeIds.length > 0) graphAPI.duplicateNodes(selectedNodeIds);
        return;
      }

      // Q — straighten selected connection
      if (e.key === 'q' || e.key === 'Q') {
        handleStraighten();
        return;
      }

      // Tab — open node palette (only when not in an embedded/showcase context)
      if (e.key === 'Tab' && screenToFlowRef.current) {
        e.preventDefault();
        // Open palette at center of viewport
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const flowPos = screenToFlowRef.current({ x: vw / 2, y: vh / 2 });
        setNodePalette({ x: vw / 2 - 150, y: vh / 2 - 200, graphX: flowPos.x, graphY: flowPos.y });
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [embedded, graphAPI, handleStraighten]);

  // ─── Right-click pan through nodes ──────────────────────────────────────────

  const rpanTarget = useRef<Element | null>(null);

  useEffect(() => {
    const BYPASS = '__ueflow_rpan';

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      if ((e as unknown as Record<string, unknown>)[BYPASS]) return;
      const rf = (e.target as HTMLElement).closest('.react-flow');
      if (!rf) return;
      const node = (e.target as HTMLElement).closest('.react-flow__node');
      if (!node) return;

      e.stopPropagation();
      e.preventDefault();

      rf.classList.add('ueflow-rpan');
      rpanTarget.current = rf;

      const pane = rf.querySelector('.react-flow__pane');
      if (pane) {
        const synth = new MouseEvent('mousedown', {
          bubbles: true, cancelable: true,
          button: 2, buttons: 2,
          clientX: e.clientX, clientY: e.clientY,
          screenX: e.screenX, screenY: e.screenY,
          view: window,
        });
        (synth as unknown as Record<string, unknown>)[BYPASS] = true;
        pane.dispatchEvent(synth);
      }
    };

    const onMouseUp = () => {
      rpanTarget.current?.classList.remove('ueflow-rpan');
      rpanTarget.current = null;
    };

    const onContextMenu = (e: Event) => {
      if ((e.target as HTMLElement).closest('.react-flow')) {
        e.preventDefault();
      }
    };

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // Close context menu / node palette when viewport pans or zooms
  const handleMoveStart = useCallback(() => {
    setContextMenu(null);
    setNodePalette(null);
  }, []);

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: AnyFlowNode[] }) => {
    setSelectedNodeIds(selectedNodes.map((n) => n.id));
    if (!onSelectedNodeChange) return;
    if (selectedNodes.length === 1) {
      const n = selectedNodes[0];
      onSelectedNodeChange(n.type === 'blueprintNode' ? (n.data as FlowNodeData).title ?? null : null);
    } else {
      onSelectedNodeChange(null);
    }
  }, [onSelectedNodeChange]);

  return (
    <GraphAPIProvider value={graphAPI}>
      <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
        <ReactFlow
          nodes={nodesWithCallback}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={handleSelectionChange}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onConnect={embedded ? undefined : handleConnect}
          isValidConnection={embedded ? undefined : handleIsValidConnection}
          onEdgeDoubleClick={embedded ? undefined : handleEdgeDoubleClick as unknown as (event: React.MouseEvent, edge: { id: string }) => void}
          onContextMenu={embedded ? undefined : handleContextMenu}
          onMoveStart={handleMoveStart}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="dark"
          onlyRenderVisibleElements
          elevateNodesOnSelect
          nodesConnectable={!embedded}
          panOnDrag={[1, 2]}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          minZoom={0.05}
          maxZoom={4}
          proOptions={{ hideAttribution: true }}
          aria-label="Blueprint graph"
        >
          <PinBodyProvider>
            <FitViewOnMount focusNode={focusNode} onReady={onReady} />
            {!embedded && <ExposeGlobalFitView />}
            {!embedded && <ExposeScreenToFlow screenToFlowRef={screenToFlowRef} />}
            <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.025)" gap={20} />
            <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.05)" gap={100} />
            {displayOptions?.showControls !== false && <Controls />}
            {displayOptions?.showMiniMap !== false && <MiniMap
              nodeColor={(node) => {
                const t = (node as AnyFlowNode).type === 'blueprintNode'
                  ? ((node as BlueprintFlowNode).data.ueType ?? '')
                  : 'comment';
                return t === 'comment' ? 'rgba(255,255,255,0.1)' : (TYPE_COLORS[t] ?? '#2a2d37');
              }}
              maskColor="rgba(0, 0, 0, 0.6)"
              zoomable
              pannable
            />}
            {displayOptions?.showZoomIndicator !== false && <ZoomIndicator />}
          </PinBodyProvider>
        </ReactFlow>
        <div className="ueflow-watermark">BLUEPRINT</div>
        {displayOptions?.showExportToolbar !== false && <ExportToolbar nodes={nodesWithCallback} edges={edges} />}

        {/* Bookmark Panel */}
        {bookmarksOpen && (
          <BookmarkPanel
            bookmarks={bookmarks}
            onGoTo={() => {/* viewport restoration requires useReactFlow — handled by parent */}}
            onRemove={removeBookmark}
            onAdd={() => {
              const label = prompt('Bookmark name:');
              if (label) addBookmark(label, graphJSON.metadata?.title ?? 'Graph', { x: 0, y: 0, zoom: 1 });
            }}
            onClose={() => setBookmarksOpen(false)}
          />
        )}

        {/* Search Panel */}
        {searchOpen && (
          <SearchPanel
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            onSelectResult={() => {/* fitView to node handled by parent */}}
            onClose={() => { setSearchOpen(false); clearSearch(); }}
          />
        )}

        {/* Alignment Toolbar */}
        {!embedded && selectedNodeIds.length >= 2 && (
          <AlignToolbar
            onAlign={handleAlign}
            onDistribute={handleDistribute}
            onStraighten={handleStraighten}
            selectedCount={selectedNodeIds.length}
          />
        )}

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={contextMenuActions}
            onClose={() => setContextMenu(null)}
          />
        )}

        {/* Node Palette */}
        {nodePalette && (
          <NodePalette
            x={nodePalette.x}
            y={nodePalette.y}
            onSelect={handlePaletteSelect}
            onClose={() => setNodePalette(null)}
            existingTitles={new Set(nodes.filter((n) => n.type === 'blueprintNode').map((n) => ((n.data as FlowNodeData).title ?? '').toLowerCase()))}
          />
        )}
      </div>
    </GraphAPIProvider>
  );
}

function useViewportScale(referenceWidth = 1440): number {
  const [scale, setScale] = useState(() =>
    Math.max(0.75, Math.min(1.5, window.innerWidth / referenceWidth)),
  );
  useEffect(() => {
    const onResize = () => {
      setScale(Math.max(0.75, Math.min(1.5, window.innerWidth / referenceWidth)));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [referenceWidth]);
  return scale;
}

function MultiGraphView({ multiGraph: initialMultiGraph }: { multiGraph: UEMultiGraphJSON }) {
  const [multiGraph, setMultiGraph] = useState(initialMultiGraph);
  const graphNames = useMemo(() => Object.keys(multiGraph.graphs), [multiGraph]);
  const {
    openTabs, activeGraph, breadcrumbs, focusNodeTitle, pinnedTab,
    selectGraph, closeTab, navigateToGraph, navigateBreadcrumb, openSpecialTab,
  } = useTabNavigation(graphNames);

  const activeTabInfo = parseTabName(activeGraph);
  const currentGraphJSON = activeTabInfo.type === 'graph' ? (multiGraph.graphs[activeGraph] ?? null) : null;
  const nodeCount = currentGraphJSON?.nodes?.length ?? 0;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [detailsItem, setDetailsItem] = useState<DetailsItem | null>(null);
  // Sidebar and details panel use auto-measurement: start with max-content sizing,
  // then pin the measured width before first paint so the resize handle has a px value.
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [detailsWidth, setDetailsWidth] = useState(340);
  const detailsRef = useRef<HTMLDivElement>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(320);
  const chatRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pin sidebar width on mount (fires before paint → no flash)
  useLayoutEffect(() => {
    if (sidebarWidth === null && sidebarRef.current) {
      setSidebarWidth(sidebarRef.current.offsetWidth);
    }
  }, [sidebarWidth]);

  const handleShowDetails = useCallback((item: DetailsItem) => {
    setDetailsItem(item);
  }, []);

  // ─── Blueprint-Level Creation (Layer 5) ───────────────────────────────────

  const handleCreateVariable = useCallback((name: string, type: string) => {
    setMultiGraph((prev) => ({
      ...prev,
      variables: [...prev.variables, { name, type }],
    }));
  }, []);

  const handleCreateEvent = useCallback((name: string) => {
    setMultiGraph((prev) => {
      if (prev.events.some((e) => e.name.toLowerCase() === name.toLowerCase())) return prev;
      return { ...prev, events: [...prev.events, { name }] };
    });
  }, []);

  const handleCreateFunction = useCallback((name: string) => {
    setMultiGraph((prev) => {
      if (prev.functions.some((f) => f.name.toLowerCase() === name.toLowerCase())) return prev;
      return {
        ...prev,
        functions: [...prev.functions, { name }],
        graphs: {
          ...prev.graphs,
          [name]: { metadata: { title: name, assetPath: '' }, nodes: [], edges: [] },
        },
      };
    });
  }, []);

  // Sync palette node creation → sidebar (events/functions appear in sidebar after palette add)
  const handleNodeCreated = useCallback((entry: { label: string; nodeClass: string }) => {
    const cls = entry.nodeClass;
    if (cls === 'K2Node_Event' || cls === 'K2Node_CustomEvent') {
      // Derive event name from label (e.g. "Event BeginPlay" → "BeginPlay")
      const eventName = entry.label.replace(/^Event\s+/i, '') || entry.label;
      setMultiGraph((prev) => {
        if (prev.events.some((e) => e.name.toLowerCase() === eventName.toLowerCase())) return prev;
        return { ...prev, events: [...prev.events, { name: eventName }] };
      });
    } else if (cls === 'K2Node_FunctionEntry') {
      const fnName = entry.label;
      setMultiGraph((prev) => {
        if (prev.functions.some((f) => f.name.toLowerCase() === fnName.toLowerCase())) return prev;
        return {
          ...prev,
          functions: [...prev.functions, { name: fnName }],
          graphs: {
            ...prev.graphs,
            [fnName]: { metadata: { title: fnName, assetPath: '' }, nodes: [], edges: [] },
          },
        };
      });
    }
  }, []);

  // Separate abort controllers per resize handle — prevents one drag from cancelling the other
  const sidebarResizeAbortRef = useRef<AbortController | null>(null);
  const detailsResizeAbortRef = useRef<AbortController | null>(null);
  const chatResizeAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => {
    sidebarResizeAbortRef.current?.abort();
    detailsResizeAbortRef.current?.abort();
    chatResizeAbortRef.current?.abort();
  }, []);

  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    sidebarResizeAbortRef.current?.abort();
    const controller = new AbortController();
    sidebarResizeAbortRef.current = controller;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarRef.current?.offsetWidth ?? 260;
    const onMove = (me: MouseEvent) => {
      const newWidth = Math.min(400, Math.max(160, startWidth + me.clientX - startX));
      setSidebarWidth(newWidth);
    };
    const onUp = () => { controller.abort(); };
    document.addEventListener('mousemove', onMove, { signal: controller.signal });
    document.addEventListener('mouseup', onUp, { signal: controller.signal });
  }, []);

  const handleDetailsResize = useCallback((e: React.MouseEvent) => {
    detailsResizeAbortRef.current?.abort();
    const controller = new AbortController();
    detailsResizeAbortRef.current = controller;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = detailsRef.current?.offsetWidth ?? 300;
    const onMove = (me: MouseEvent) => {
      const newWidth = Math.min(600, Math.max(200, startWidth - (me.clientX - startX)));
      setDetailsWidth(newWidth);
    };
    const onUp = () => { controller.abort(); };
    document.addEventListener('mousemove', onMove, { signal: controller.signal });
    document.addEventListener('mouseup', onUp, { signal: controller.signal });
  }, []);

  const handleChatResize = useCallback((e: React.MouseEvent) => {
    chatResizeAbortRef.current?.abort();
    const controller = new AbortController();
    chatResizeAbortRef.current = controller;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatRef.current?.offsetWidth ?? 320;
    const onMove = (me: MouseEvent) => {
      const newWidth = Math.min(500, Math.max(240, startWidth - (me.clientX - startX)));
      setChatWidth(newWidth);
    };
    const onUp = () => { controller.abort(); };
    document.addEventListener('mousemove', onMove, { signal: controller.signal });
    document.addEventListener('mouseup', onUp, { signal: controller.signal });
  }, []);

  const handleToggleChat = useCallback(() => {
    setChatOpen((prev) => !prev);
  }, []);

  const chatContext = useMemo(
    () => serializeMultiGraphContext(multiGraph, activeGraph),
    [multiGraph, activeGraph],
  );

  const nodeTitles = useMemo(() => {
    const graph = multiGraph.graphs[activeGraph];
    if (!graph) return [];
    return graph.nodes.map((n) => n.title).filter(Boolean);
  }, [multiGraph, activeGraph]);

  const title = multiGraph.metadata?.title || multiGraph.metadata?.blueprintName || multiGraph.metadata?.assetPath || 'Blueprint';
  const scale = useViewportScale();

  return (
    <div className="ueflow-app-shell" style={{ '--uf-scale': scale } as React.CSSProperties}>
      <a href="#ueflow-graph" className="ueflow-skip-link">Skip to graph</a>
      <TopBar
        title={title}
        onToggleChat={handleToggleChat}
        chatOpen={chatOpen}
        graphContext={chatContext}
        onNavigateToNode={navigateToGraph}
        nodeTitles={nodeTitles}
        onMenuToggle={isMobile ? () => setDrawerOpen(o => !o) : undefined}
      />
      <div className="ueflow-multi-layout">
        {isMobile ? (
          drawerOpen && (
            <>
              <div className="ueflow-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
              <div className="ueflow-drawer">
                <Sidebar multiGraph={multiGraph} onNavigateToGraph={(g, n) => { navigateToGraph(g, n); setDrawerOpen(false); }} onShowDetails={handleShowDetails} onOpenSpecialTab={(t) => { openSpecialTab(t); setDrawerOpen(false); }} onCreateVariable={handleCreateVariable} onCreateEvent={handleCreateEvent} onCreateFunction={handleCreateFunction} />
              </div>
            </>
          )
        ) : (
          <>
            <div ref={sidebarRef} style={{ width: sidebarWidth ?? 'max-content', minWidth: 160, maxWidth: 400, flexShrink: 0 }}>
              <Sidebar multiGraph={multiGraph} onNavigateToGraph={navigateToGraph} onShowDetails={handleShowDetails} onOpenSpecialTab={openSpecialTab} onCreateVariable={handleCreateVariable} onCreateEvent={handleCreateEvent} onCreateFunction={handleCreateFunction} />
            </div>
            <div className="ueflow-sidebar-resize" onMouseDown={handleSidebarResize} />
          </>
        )}
        <main className="ueflow-multi-main">
          <TabBar
            openTabs={openTabs}
            activeGraph={activeGraph}
            onSelectGraph={selectGraph}
            onCloseTab={closeTab}
            pinnedTab={pinnedTab}
            comparison={multiGraph.comparison}
          />
          <Breadcrumbs items={breadcrumbs} onNavigate={navigateBreadcrumb} />
          <div id="ueflow-graph" className="ueflow-graph-container" role="tabpanel" aria-label={activeGraph}>
            {activeTabInfo.type === 'datatable' ? (
              (() => {
                const dt = multiGraph.dataTables?.[activeTabInfo.name];
                return <DataTableView name={activeTabInfo.name} columns={dt?.columns} sampleRows={dt?.sampleRows} />;
              })()
            ) : activeTabInfo.type === 'struct' ? (
              (() => {
                const s = multiGraph.structs?.find((st) => st.name === activeTabInfo.name);
                return <StructView name={activeTabInfo.name} fields={s?.fields ?? []} />;
              })()
            ) : currentGraphJSON ? (
              <ErrorBoundary key={activeGraph}>
                <SingleGraphView key={activeGraph} graphJSON={currentGraphJSON} focusNodeTitle={focusNodeTitle} onSelectedNodeChange={setSelectedNode} onNodeCreated={handleNodeCreated} />
              </ErrorBoundary>
            ) : (
              <div className="ueflow-empty-graph">
                <div className="ueflow-empty-graph-card">
                  <div className="ueflow-empty-graph-icon">&#9670;</div>
                  <div className="ueflow-empty-graph-title">No Graph Selected</div>
                  <div className="ueflow-empty-graph-subtitle">
                    Select a graph from the sidebar or open a tab to view its Blueprint.
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        {detailsItem && (
          isMobile ? (
            <>
              <div className="ueflow-bottomsheet-backdrop" onClick={() => setDetailsItem(null)} />
              <div className="ueflow-bottomsheet">
                <DetailsPanel item={detailsItem} onClose={() => setDetailsItem(null)} structs={multiGraph.structs} />
              </div>
            </>
          ) : (
            <>
              <div className="ueflow-details-resize" onMouseDown={handleDetailsResize} />
              <div ref={detailsRef} style={{ width: detailsWidth, minWidth: 260, maxWidth: 600, flexShrink: 0 }}>
                <DetailsPanel item={detailsItem} onClose={() => setDetailsItem(null)} structs={multiGraph.structs} />
              </div>
            </>
          )
        )}
        {chatOpen && (
          isMobile ? (
            <div className="ueflow-chat-fullscreen">
              <ChatPanel graphContext={chatContext} onClose={handleToggleChat} selectedNodeTitle={selectedNode} />
            </div>
          ) : (
            <>
              <div className="ueflow-chat-resize" onMouseDown={handleChatResize} />
              <div ref={chatRef} style={{ width: chatWidth, minWidth: 240, maxWidth: 500, flexShrink: 0 }}>
                <ChatPanel graphContext={chatContext} onClose={handleToggleChat} selectedNodeTitle={selectedNode} />
              </div>
            </>
          )
        )}
      </div>
      {!isMobile && (
        <StatusBar
          activeGraph={activeGraph}
          nodeCount={nodeCount}
          variableCount={multiGraph.variables?.length ?? 0}
          functionCount={multiGraph.functions?.length ?? 0}
          graphCount={graphNames.length}
          comparison={multiGraph.comparison}
          selectedNode={selectedNode}
        />
      )}
    </div>
  );
}

export function App({ graphJSON, multiGraphJSON }: AppProps) {
  const [pastedGraph, setPastedGraph] = useState<UEGraphJSON | null>(null);
  const [pasteCount, setPasteCount] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [singleChatOpen, setSingleChatOpen] = useState(false);
  const [singleSelectedNode, setSingleSelectedNode] = useState<string | null>(null);
  const [explainerNode, setExplainerNode] = useState<{ title: string; nodeClass: string; position: { x: number; y: number } } | null>(null);

  const handleGraphParsed = useCallback((graph: UEGraphJSON) => {
    setPastedGraph(graph);
    setPasteCount(c => c + 1);
  }, []);

  const handleBackToPaste = useCallback(() => {
    setPastedGraph(null);
    setDemoMode(false);
  }, []);

  const handleExploreDemoBlueprint = useCallback(() => {
    setDemoMode(true);
  }, []);

  const handleAcceptGeneratedGraph = useCallback((graph: UEGraphJSON, mode: 'merge' | 'new') => {
    if (mode === 'new' || !pastedGraph) {
      // Open as new standalone graph
      setPastedGraph(graph);
      setPasteCount(c => c + 1);
    } else {
      // Merge: offset generated graph to the right of existing nodes
      const maxX = pastedGraph.nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
      const offsetGraph = offsetGraphPositions(graph, maxX + 400, 0);
      const merged: UEGraphJSON = {
        metadata: pastedGraph.metadata,
        nodes: [...pastedGraph.nodes, ...offsetGraph.nodes],
        edges: [...pastedGraph.edges, ...offsetGraph.edges],
      };
      setPastedGraph(merged);
      setPasteCount(c => c + 1);
    }
  }, [pastedGraph]);

  const handleSingleSelectedNodeChange = useCallback((title: string | null) => {
    setSingleSelectedNode(title);
    if (!title) {
      setExplainerNode(null);
    }
  }, []);

  // Multi-graph mode takes precedence (embedded or demo)
  const activeMultiGraph = multiGraphJSON ?? (demoMode ? DEMO_MULTIGRAPH : null);
  if (activeMultiGraph && Object.keys(activeMultiGraph.graphs).length > 0) {
    return (
      <>
        {demoMode && (
          <button className="ueflow-back-btn" onClick={handleBackToPaste}>
            &#8592; Back to Landing
          </button>
        )}
        <MultiGraphView multiGraph={activeMultiGraph} />
      </>
    );
  }

  // Single-graph mode — embedded JSON takes precedence over pasted graph
  const activeGraph = graphJSON ?? pastedGraph;
  if (activeGraph) {
    return (
      <div style={{ width: '100%', height: '100vh' }}>
        {pastedGraph && !graphJSON && (
          <button className="ueflow-back-btn" onClick={handleBackToPaste}>
            &#8592; New Paste
          </button>
        )}
        <SingleGraphView
          key={pastedGraph ? `paste-${pasteCount}` : 'embedded'}
          graphJSON={activeGraph}
          onSelectedNodeChange={handleSingleSelectedNodeChange}
        />
        {explainerNode && (
          <NodeExplainer
            nodeTitle={explainerNode.title}
            nodeClass={explainerNode.nodeClass}
            position={explainerNode.position}
            onDismiss={() => setExplainerNode(null)}
          />
        )}
        {singleChatOpen && (
          <ChatPanel
            graphContext={serializeGraphContext(activeGraph)}
            onClose={() => setSingleChatOpen(false)}
            floating
            selectedNodeTitle={singleSelectedNode}
            onAcceptGraph={handleAcceptGeneratedGraph}
          />
        )}
        {!singleChatOpen && (
          <button
            className="ueflow-chat-fab"
            onClick={() => setSingleChatOpen(true)}
          >
            &#129302; AI Chat
          </button>
        )}
      </div>
    );
  }

  // Empty state — full landing page
  return <LandingPage onGraphParsed={handleGraphParsed} onExploreDemoBlueprint={handleExploreDemoBlueprint} />;
}
