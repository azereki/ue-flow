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
import { useUndoRedo } from './hooks/useUndoRedo';
import { LandingPage } from './components/LandingPage';
import { ChatPanel } from './components/ChatPanel';
import { NodeExplainer } from './components/NodeExplainer';
import { DEMO_MULTIGRAPH } from './data/demo-multigraph';
import { serializeGraphContext, serializeMultiGraphContext } from './utils/graph-context';
import { offsetGraphPositions } from './utils/ai-generate';
import { useIsMobile } from './hooks/useIsMobile';

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

export interface DisplayOptions {
  showControls?: boolean;
  showMiniMap?: boolean;
  showExportToolbar?: boolean;
  showZoomIndicator?: boolean;
}

export function SingleGraphView({ graphJSON, focusNodeTitle, onSelectedNodeChange, embedded, displayOptions, onReady }: { graphJSON: UEGraphJSON; focusNodeTitle?: string | null; onSelectedNodeChange?: (title: string | null) => void; embedded?: boolean; displayOptions?: DisplayOptions; onReady?: () => void }) {
  const initial = useMemo(() => graphJsonToFlow(graphJSON), [graphJSON]);
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyFlowNode>(initial.nodes);
  // useEdgesState is kept untyped because its OnEdgesChange generic is contravariant —
  // React Flow's internal edge changes produce base Edge objects which can't satisfy the
  // narrower BlueprintFlowEdge constraint at the handler level. We cast at usage sites.
  const [edgesRaw, , onEdgesChange] = useEdgesState(initial.edges);
  const edges = edgesRaw as BlueprintFlowEdge[];
  const { captureSnapshot } = useUndoRedo(nodes, setNodes);

  // Issue 3: inject __setPinValue callback into each BlueprintNode's data so that
  // PinValueEditor edits propagate back to the node store.  flowToT3D() reads
  // data.pins[i].defaultValue, so we patch that field in-place on the node.
  const setPinValue = useCallback((nodeId: string, pinId: string, value: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || n.type !== 'blueprintNode') return n;
        const bp = n as BlueprintFlowNode;
        const updatedPins = bp.data.pins.map((p) =>
          p.id === pinId ? { ...p, defaultValue: value } : p,
        );
        return { ...bp, data: { ...bp.data, pins: updatedPins } };
      }),
    );
  }, [setNodes]);

  // Stable ref wrapper: the callback identity never changes, so nodesWithCallback
  // can bail out early for nodes that already have it attached — avoids re-spreading
  // every node on every drag frame.
  const setPinValueRef = useRef(setPinValue);
  setPinValueRef.current = setPinValue;
  const stableSetPinValue = useCallback(
    (nodeId: string, pinId: string, value: string) => { setPinValueRef.current(nodeId, pinId, value); },
    [],
  );

  // Attach __setPinValue to every blueprintNode's data.
  // We do this as a derived value from nodes so nodes without the callback always get it.
  const nodesWithCallback = useMemo(() =>
    nodes.map((n) => {
      if (n.type !== 'blueprintNode') return n;
      const bp = n as BlueprintFlowNode;
      if (bp.data.__setPinValue === stableSetPinValue) return n; // already attached, skip allocation
      return { ...bp, data: { ...bp.data, __setPinValue: stableSetPinValue } };
    }),
    [nodes, stableSetPinValue],
  );

  // Resolve focus title to node position using stable initial data
  // Handles mismatches: sidebar has "BeginPlay", graph has "Event ReceiveBeginPlay"
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

  // Ref to current nodes so drag handlers read latest state without closure staleness
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const handleNodeDragStart = useCallback((_: React.MouseEvent, node: AnyFlowNode) => {
    captureSnapshot();
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
    // Elevate comment above non-children (z 500 + 1000 from elevateNodesOnSelect = 1500),
    // and children even higher (z 2000) so they always render on top of the comment.
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === node.id) return { ...n, zIndex: 500 };
        if (childIds.has(n.id)) return { ...n, zIndex: 2000 };
        return n;
      }),
    );
  }, [setNodes, captureSnapshot]);

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
      // Reset comment and child z-index back to defaults after drag
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

  // Right-click pan through nodes: React Flow adds the "nopan" class to all draggable
  // node wrappers, and d3-zoom's filter rejects mousedown events originating from
  // inside .nopan. There's a bypass for middle-click but not right-click.
  // Fix: intercept mousedown (what d3-zoom listens for) on nodes in capture phase,
  // then re-dispatch on .react-flow__pane (outside .nopan) so the filter passes.
  // d3-zoom binds mousemove/mouseup on event.view (window), so view must be set.
  // Track which .react-flow instance is being right-click-panned so mouseup
  // can clean up the correct one (supports multiple embeds on the same page).
  const rpanTarget = useRef<Element | null>(null);

  useEffect(() => {
    const BYPASS = '__ueflow_rpan';

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      if ((e as unknown as Record<string, unknown>)[BYPASS]) return;
      // Scope to the closest .react-flow ancestor (not document.querySelector)
      const rf = (e.target as HTMLElement).closest('.react-flow');
      if (!rf) return;
      const node = (e.target as HTMLElement).closest('.react-flow__node');
      if (!node) return;

      e.stopPropagation();
      e.preventDefault();

      // Safety: disable pointer-events on nodes so mousemove reaches pane
      rf.classList.add('ueflow-rpan');
      rpanTarget.current = rf;

      // Re-dispatch on the pane — event.target will be the pane (not inside .nopan)
      // and event.view must be window so d3-zoom can bind mousemove/mouseup there
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

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: AnyFlowNode[] }) => {
    if (!onSelectedNodeChange) return;
    if (selectedNodes.length === 1) {
      const n = selectedNodes[0];
      onSelectedNodeChange(n.type === 'blueprintNode' ? (n.data as FlowNodeData).title ?? null : null);
    } else {
      onSelectedNodeChange(null);
    }
  }, [onSelectedNodeChange]);

  return (
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
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        onlyRenderVisibleElements
        elevateNodesOnSelect
        nodesConnectable={false}
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
          <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.025)" gap={20} />
          <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.05)" gap={100} />
          {displayOptions?.showControls !== false && <Controls />}
          {displayOptions?.showMiniMap !== false && <MiniMap nodeColor={(node) => {
            const t = (node as AnyFlowNode).type === 'blueprintNode'
              ? ((node as BlueprintFlowNode).data.ueType ?? '')
              : 'comment';
            return TYPE_COLORS[t] ?? '#2a2d37';
          }} maskColor="rgba(0, 0, 0, 0.7)" />}
          {displayOptions?.showZoomIndicator !== false && <ZoomIndicator />}
        </PinBodyProvider>
      </ReactFlow>
      <div className="ueflow-watermark">BLUEPRINT</div>
      {displayOptions?.showExportToolbar !== false && <ExportToolbar nodes={nodesWithCallback} edges={edges} />}
    </div>
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

function MultiGraphView({ multiGraph }: { multiGraph: UEMultiGraphJSON }) {
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
                <Sidebar multiGraph={multiGraph} onNavigateToGraph={(g, n) => { navigateToGraph(g, n); setDrawerOpen(false); }} onShowDetails={handleShowDetails} onOpenSpecialTab={(t) => { openSpecialTab(t); setDrawerOpen(false); }} />
              </div>
            </>
          )
        ) : (
          <>
            <div ref={sidebarRef} style={{ width: sidebarWidth ?? 'max-content', minWidth: 160, maxWidth: 400, flexShrink: 0 }}>
              <Sidebar multiGraph={multiGraph} onNavigateToGraph={navigateToGraph} onShowDetails={handleShowDetails} onOpenSpecialTab={openSpecialTab} />
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
                <SingleGraphView key={activeGraph} graphJSON={currentGraphJSON} focusNodeTitle={focusNodeTitle} onSelectedNodeChange={setSelectedNode} />
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
