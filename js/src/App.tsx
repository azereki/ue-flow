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

const nodeTypes = {
  blueprintNode: BlueprintNode,
  commentNode: CommentNode,
};
const edgeTypes = { blueprintEdge: BlueprintEdge };

interface AppProps {
  graphJSON: UEGraphJSON | null;
  multiGraphJSON?: UEMultiGraphJSON | null;
}

function FitViewOnMount({ focusNode }: { focusNode?: { x: number; y: number; w: number; h: number } }) {
  const { fitView, setCenter } = useReactFlow();
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    const id = requestAnimationFrame(() => {
      if (focusNode) {
        setCenter(
          focusNode.x + focusNode.w / 2,
          focusNode.y + focusNode.h / 2,
          { zoom: 1.0 },
        );
      } else {
        fitView({ padding: 0.15, minZoom: 0.5, maxZoom: 1.5 });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [focusNode, fitView, setCenter]);
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

function SingleGraphView({ graphJSON, focusNodeTitle, onSelectedNodeChange }: { graphJSON: UEGraphJSON; focusNodeTitle?: string | null; onSelectedNodeChange?: (title: string | null) => void }) {
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

  // Attach __setPinValue to every blueprintNode's data.
  // We do this as a derived value from nodes so nodes without the callback always get it.
  const nodesWithCallback = useMemo(() =>
    nodes.map((n) => {
      if (n.type !== 'blueprintNode') return n;
      const bp = n as BlueprintFlowNode;
      if (bp.data.__setPinValue === setPinValue) return n; // already attached, skip allocation
      return { ...bp, data: { ...bp.data, __setPinValue: setPinValue } };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, setPinValue],
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

  const handleNodeDragStart = useCallback((_: React.MouseEvent, node: AnyFlowNode) => {
    captureSnapshot();
    if (node.type !== 'commentNode') return;
    const cx = node.position.x;
    const cy = node.position.y;
    const cw = node.initialWidth ?? 400;
    const ch = node.initialHeight ?? 200;
    const childIds = new Set<string>();
    for (const n of nodes) {
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
  }, [nodes, setNodes, captureSnapshot]);

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
  useEffect(() => {
    const BYPASS = '__ueflow_rpan';

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      if ((e as unknown as Record<string, unknown>)[BYPASS]) return;
      const rf = document.querySelector('.react-flow');
      if (!rf?.contains(e.target as Node)) return;
      const node = (e.target as HTMLElement).closest('.react-flow__node');
      if (!node) return;

      e.stopPropagation();
      e.preventDefault();

      // Safety: disable pointer-events on nodes so mousemove reaches pane
      rf.classList.add('ueflow-rpan');

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
      document.querySelector('.react-flow')?.classList.remove('ueflow-rpan');
    };

    const onContextMenu = (e: Event) => {
      if (document.querySelector('.react-flow')?.contains(e.target as Node)) {
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
          <FitViewOnMount focusNode={focusNode} />
          <ExposeGlobalFitView />
          <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.025)" gap={20} />
          <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.05)" gap={100} />
          <Controls />
          <MiniMap nodeColor={(node) => {
            const t = (node as AnyFlowNode).type === 'blueprintNode'
              ? ((node as BlueprintFlowNode).data.ueType ?? '')
              : 'comment';
            if (t === 'event' || t === 'function_entry') return '#B40000';
            if (t === 'call_function' || t === 'function') return '#1060A8';
            if (t === 'branch') return '#404040';
            if (t === 'variable_get' || t === 'variable_set') return '#208050';
            if (t === 'comment') return '#4a4a5a';
            if (t === 'macro') return '#8020a0';
            return '#2a2d37';
          }} maskColor="rgba(0, 0, 0, 0.7)" />
          <ZoomIndicator />
        </PinBodyProvider>
      </ReactFlow>
      <div className="ueflow-watermark">BLUEPRINT</div>
      <ExportToolbar nodes={nodesWithCallback} edges={edges} />
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

  const [detailsWidth, setDetailsWidth] = useState<number | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Pin sidebar width on mount (fires before paint → no flash)
  useLayoutEffect(() => {
    if (sidebarWidth === null && sidebarRef.current) {
      setSidebarWidth(sidebarRef.current.offsetWidth);
    }
  }, [sidebarWidth]);

  // Pin details width on first open (fires before paint → no flash)
  useLayoutEffect(() => {
    if (detailsWidth === null && detailsRef.current && detailsItem) {
      setDetailsWidth(detailsRef.current.offsetWidth);
    }
  }, [detailsWidth, detailsItem]);

  const handleShowDetails = useCallback((item: DetailsItem) => {
    setDetailsItem(item);
  }, []);

  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarRef.current?.offsetWidth ?? 260;
    const onMove = (me: MouseEvent) => {
      const newWidth = Math.min(400, Math.max(160, startWidth + me.clientX - startX));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const handleDetailsResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = detailsRef.current?.offsetWidth ?? 300;
    const onMove = (me: MouseEvent) => {
      const newWidth = Math.min(600, Math.max(200, startWidth - (me.clientX - startX)));
      setDetailsWidth(newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const title = multiGraph.metadata?.title || multiGraph.metadata?.blueprintName || multiGraph.metadata?.assetPath || 'Blueprint';
  const scale = useViewportScale();

  return (
    <div className="ueflow-app-shell" style={{ '--uf-scale': scale } as React.CSSProperties}>
      <a href="#ueflow-graph" className="ueflow-skip-link">Skip to graph</a>
      <TopBar
        title={title}
        graphCount={graphNames.length}
        functionCount={multiGraph.functions?.length ?? 0}
        variableCount={multiGraph.variables?.length ?? 0}
      />
      <div className="ueflow-multi-layout">
        <div ref={sidebarRef} style={{ width: sidebarWidth ?? 'max-content', minWidth: 160, maxWidth: 400, flexShrink: 0 }}>
          <Sidebar multiGraph={multiGraph} onNavigateToGraph={navigateToGraph} onShowDetails={handleShowDetails} onOpenSpecialTab={openSpecialTab} />
        </div>
        <div className="ueflow-sidebar-resize" onMouseDown={handleSidebarResize} />
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
          <div id="ueflow-graph" className="ueflow-graph-container">
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
              <div className="ueflow-empty-graph">No graph selected</div>
            )}
          </div>
        </main>
        {detailsItem && (
          <>
            <div className="ueflow-details-resize" onMouseDown={handleDetailsResize} />
            <div ref={detailsRef} style={{ width: detailsWidth ?? 'max-content', minWidth: 200, maxWidth: 600, flexShrink: 0 }}>
              <DetailsPanel item={detailsItem} onClose={() => setDetailsItem(null)} structs={multiGraph.structs} />
            </div>
          </>
        )}
      </div>
      <StatusBar
        activeGraph={activeGraph}
        nodeCount={nodeCount}
        variableCount={multiGraph.variables?.length ?? 0}
        functionCount={multiGraph.functions?.length ?? 0}
        graphCount={graphNames.length}
        comparison={multiGraph.comparison}
        selectedNode={selectedNode}
      />
    </div>
  );
}

export function App({ graphJSON, multiGraphJSON }: AppProps) {
  // Multi-graph mode takes precedence
  if (multiGraphJSON && Object.keys(multiGraphJSON.graphs).length > 0) {
    return <MultiGraphView multiGraph={multiGraphJSON} />;
  }

  // Single-graph mode
  if (graphJSON) {
    return (
      <div style={{ width: '100vw', height: '100vh' }}>
        <SingleGraphView graphJSON={graphJSON} />
      </div>
    );
  }

  // Empty state
  return (
    <div className="ueflow-empty-state">
      <div className="ueflow-empty-icon">&#9670;</div>
      <div className="ueflow-empty-title">No Blueprint Loaded</div>
      <div className="ueflow-empty-text">
        Provide graph JSON data to render an interactive Blueprint graph.
      </div>
    </div>
  );
}
