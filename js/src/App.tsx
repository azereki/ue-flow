import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
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

const nodeTypes = {
  blueprintNode: BlueprintNode,
  commentNode: CommentNode,
};
const edgeTypes = { blueprintEdge: BlueprintEdge };

interface AppProps {
  graphJSON: UEGraphJSON | null;
  multiGraphJSON?: UEMultiGraphJSON | null;
}

function FitViewOnMount() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitView({ padding: 0.15, maxZoom: 1.2 });
    });
    return () => cancelAnimationFrame(id);
  }, [fitView]);
  return null;
}

function SingleGraphView({ graphJSON }: { graphJSON: UEGraphJSON }) {
  const initial = useMemo(() => graphJsonToFlow(graphJSON), [graphJSON]);
  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.05}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
      >
        <FitViewOnMount />
        <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.03)" gap={20} />
        <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.06)" gap={100} />
        <Controls />
        <MiniMap nodeColor={() => '#2a2d37'} maskColor="rgba(0, 0, 0, 0.7)" />
      </ReactFlow>
      <ExportToolbar nodes={nodes} edges={edges} />
    </div>
  );
}

function MultiGraphView({ multiGraph }: { multiGraph: UEMultiGraphJSON }) {
  const graphNames = useMemo(() => Object.keys(multiGraph.graphs), [multiGraph]);
  const [activeGraph, setActiveGraph] = useState(graphNames[0] ?? '');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { label: graphNames[0] ?? 'Graph', graphName: graphNames[0] ?? '' },
  ]);

  const currentGraphJSON = multiGraph.graphs[activeGraph] ?? null;
  const nodeCount = currentGraphJSON?.nodes?.length ?? 0;

  const handleSelectGraph = useCallback((name: string) => {
    setActiveGraph(name);
    setBreadcrumbs([{ label: name, graphName: name }]);
  }, []);

  const handleNavigateToGraph = useCallback((name: string) => {
    const exact = graphNames.find((g) => g === name);
    const fuzzy = exact ?? graphNames.find((g) => g.toLowerCase() === name.toLowerCase());
    if (fuzzy) {
      setActiveGraph(fuzzy);
      setBreadcrumbs((prev) => [...prev, { label: fuzzy, graphName: fuzzy }]);
    }
  }, [graphNames]);

  const handleBreadcrumbNavigate = useCallback((index: number) => {
    const item = breadcrumbs[index];
    if (item) {
      setActiveGraph(item.graphName);
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
    }
  }, [breadcrumbs]);

  const [detailsItem, setDetailsItem] = useState<DetailsItem | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(240);

  const handleShowDetails = useCallback((item: DetailsItem) => {
    setDetailsItem(item);
  }, []);

  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
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
  }, [sidebarWidth]);

  const title = multiGraph.metadata?.blueprintName || multiGraph.metadata?.assetPath || 'Blueprint';

  return (
    <div className="ueflow-app-shell">
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
            graphNames={graphNames}
            activeGraph={activeGraph}
            onSelectGraph={handleSelectGraph}
            comparison={multiGraph.comparison}
          />
          <Breadcrumbs items={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />
          <div className="ueflow-graph-container">
            {currentGraphJSON ? (
              <SingleGraphView key={activeGraph} graphJSON={currentGraphJSON} />
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
        comparison={multiGraph.comparison as any}
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
