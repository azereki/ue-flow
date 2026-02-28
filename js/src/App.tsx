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
import { Breadcrumbs, type BreadcrumbItem } from './components/Breadcrumbs';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';
import { DetailsPanel, type DetailsItem } from './components/DetailsPanel';
import type { UEGraphJSON, UEMultiGraphJSON } from './types/ue-graph';
import type { FlowNodeData } from './transform/json-to-flow';
import { zoomSelector } from './utils/selectors';

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

function ZoomIndicator() {
  const zoom = useStore(zoomSelector);
  return <div className="ueflow-zoom-indicator">Zoom {Math.round(zoom * 100)}%</div>;
}

function SingleGraphView({ graphJSON, focusNodeTitle }: { graphJSON: UEGraphJSON; focusNodeTitle?: string | null }) {
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
  const dragContext = useRef<{ childIds: Set<string>; lastPos: { x: number; y: number } } | null>(null);

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
    dragContext.current = { childIds, lastPos: { x: cx, y: cy } };
  }, [nodes]);

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
    dragContext.current = null;
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
        <FitViewOnMount focusNode={focusNode} />
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
  const firstGraph = graphNames[0] ?? '';
  const DEFAULT_TAB = firstGraph;
  const [openTabs, setOpenTabs] = useState<string[]>([firstGraph]);
  const [activeGraph, setActiveGraph] = useState(firstGraph);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(
    firstGraph ? [{ label: firstGraph, graphName: firstGraph }] : [],
  );

  const currentGraphJSON = multiGraph.graphs[activeGraph] ?? null;
  const nodeCount = currentGraphJSON?.nodes?.length ?? 0;

  const openTab = useCallback((name: string) => {
    setOpenTabs(prev => prev.includes(name) ? prev : [...prev, name]);
    setActiveGraph(name);
  }, []);

  const closeTab = useCallback((name: string) => {
    if (name === DEFAULT_TAB) return;
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== name);
      setActiveGraph(current => {
        if (current === name) {
          const closedIndex = prev.indexOf(name);
          const fallback = next[Math.min(closedIndex, next.length - 1)] ?? DEFAULT_TAB;
          setBreadcrumbs([{ label: fallback, graphName: fallback }]);
          return fallback;
        }
        return current;
      });
      return next;
    });
  }, [DEFAULT_TAB]);

  const handleSelectGraph = useCallback((name: string) => {
    setActiveGraph(name);
    setBreadcrumbs([{ label: name, graphName: name }]);
  }, []);

  const [focusNodeTitle, setFocusNodeTitle] = useState<string | null>(null);

  const handleNavigateToGraph = useCallback((name: string, focusTitle?: string) => {
    const exact = graphNames.find((g) => g === name);
    const fuzzy = exact ?? graphNames.find((g) => g.toLowerCase() === name.toLowerCase());
    if (fuzzy) {
      openTab(fuzzy);
      setBreadcrumbs([{ label: fuzzy, graphName: fuzzy }]);
      setFocusNodeTitle(focusTitle ?? null);
    }
  }, [graphNames, openTab]);

  const handleBreadcrumbNavigate = useCallback((index: number) => {
    const item = breadcrumbs[index];
    if (item) {
      setActiveGraph(item.graphName);
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
    }
  }, [breadcrumbs]);

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
      <TopBar
        title={title}
        graphCount={graphNames.length}
        functionCount={multiGraph.functions?.length ?? 0}
        variableCount={multiGraph.variables?.length ?? 0}
      />
      <div className="ueflow-multi-layout">
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0 }}>
          <Sidebar multiGraph={multiGraph} onNavigateToGraph={handleNavigateToGraph} onShowDetails={handleShowDetails} />
        </div>
        <div className="uf-sidebar-resize" onMouseDown={handleSidebarResize} />
        <div className="ueflow-multi-main">
          <TabBar
            openTabs={openTabs}
            activeGraph={activeGraph}
            onSelectGraph={handleSelectGraph}
            onCloseTab={closeTab}
            pinnedTab={DEFAULT_TAB}
            comparison={multiGraph.comparison}
          />
          <Breadcrumbs items={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />
          <div className="ueflow-graph-container">
            {currentGraphJSON ? (
              <SingleGraphView key={`${activeGraph}:${focusNodeTitle ?? ''}`} graphJSON={currentGraphJSON} focusNodeTitle={focusNodeTitle} />
            ) : (
              <div className="ueflow-empty-graph">No graph selected</div>
            )}
          </div>
        </div>
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
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', color: '#71717a' }}>
      No graph data loaded
    </div>
  );
}
