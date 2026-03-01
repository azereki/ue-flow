import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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
import type { UEGraphJSON, UEMultiGraphJSON } from './types/ue-graph';
import type { FlowNodeData } from './transform/json-to-flow';
import { zoomSelector } from './utils/selectors';
import { useTabNavigation } from './hooks/useTabNavigation';

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
    (window as Record<string, unknown>).ueFlowFitView = () => {
      fitView({ padding: 0.15, minZoom: 0.5, maxZoom: 1.5 });
    };
    return () => { delete (window as Record<string, unknown>).ueFlowFitView; };
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
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);

  // Resolve focus title to node position using stable initial data
  // Handles mismatches: sidebar has "BeginPlay", graph has "Event ReceiveBeginPlay"
  const focusNode = useMemo(() => {
    if (!focusNodeTitle) return undefined;
    const q = focusNodeTitle.toLowerCase();
    const target = initial.nodes.find((n) => {
      const title = ((n.data as FlowNodeData).title ?? '').toLowerCase();
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

  const handleNodeDragStart = useCallback((_: React.MouseEvent, node: { id: string; position: { x: number; y: number }; data: Record<string, unknown>; initialWidth?: number; initialHeight?: number }) => {
    if ((node.data as FlowNodeData).ueType !== 'comment') return;
    const cx = node.position.x;
    const cy = node.position.y;
    const cw = node.initialWidth ?? 400;
    const ch = node.initialHeight ?? 200;
    const childIds = new Set<string>();
    for (const n of nodes) {
      if (n.id === node.id || (n.data as FlowNodeData).ueType === 'comment') continue;
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
  }, [nodes, setNodes]);

  const handleNodeDrag = useCallback((_: React.MouseEvent, node: { id: string; position: { x: number; y: number }; data: Record<string, unknown> }) => {
    const ctx = dragContext.current;
    if (!ctx || (node.data as FlowNodeData).ueType !== 'comment' || ctx.childIds.size === 0) return;
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

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Array<{ data: Record<string, unknown> }> }) => {
    if (!onSelectedNodeChange) return;
    if (selectedNodes.length === 1) {
      onSelectedNodeChange((selectedNodes[0].data as FlowNodeData).title ?? null);
    } else {
      onSelectedNodeChange(null);
    }
  }, [onSelectedNodeChange]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <ReactFlow
        nodes={nodes}
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
        minZoom={0.05}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
      >
        <PinBodyProvider>
          <FitViewOnMount focusNode={focusNode} />
          <ExposeGlobalFitView />
          <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.03)" gap={20} />
          <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.06)" gap={100} />
          <Controls />
          <MiniMap nodeColor={(node) => {
            const t = (node.data as FlowNodeData)?.ueType ?? '';
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
      <ExportToolbar nodes={nodes} edges={edges} />
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
    selectGraph, closeTab, navigateToGraph, navigateBreadcrumb,
  } = useTabNavigation(graphNames);

  const currentGraphJSON = multiGraph.graphs[activeGraph] ?? null;
  const nodeCount = currentGraphJSON?.nodes?.length ?? 0;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [detailsItem, setDetailsItem] = useState<DetailsItem | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const sidebarWidthRef = useRef(sidebarWidth);
  useEffect(() => { sidebarWidthRef.current = sidebarWidth; }, [sidebarWidth]);

  const handleShowDetails = useCallback((item: DetailsItem) => {
    setDetailsItem(item);
  }, []);

  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;
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
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0 }}>
          <Sidebar multiGraph={multiGraph} onNavigateToGraph={navigateToGraph} onShowDetails={handleShowDetails} />
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
            {currentGraphJSON ? (
              <SingleGraphView key={`${activeGraph}:${focusNodeTitle ?? ''}`} graphJSON={currentGraphJSON} focusNodeTitle={focusNodeTitle} onSelectedNodeChange={setSelectedNode} />
            ) : (
              <div className="ueflow-empty-graph">No graph selected</div>
            )}
          </div>
        </main>
        {detailsItem && (
          <DetailsPanel item={detailsItem} onClose={() => setDetailsItem(null)} />
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
