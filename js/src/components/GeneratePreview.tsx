import { useMemo, useCallback, type FC } from 'react';
import { ReactFlowProvider, ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
import { graphJsonToFlow } from '../transform/json-to-flow';
import { BlueprintNode } from '../nodes/BlueprintNode';
import { CommentNode } from '../nodes/CommentNode';
import { BlueprintEdge } from '../edges/BlueprintEdge';
import type { UEGraphJSON } from '../types/ue-graph';

const nodeTypes = { blueprintNode: BlueprintNode, commentNode: CommentNode };
const edgeTypes = { blueprintEdge: BlueprintEdge };

interface GeneratePreviewProps {
  graph: UEGraphJSON;
  onAccept: (graph: UEGraphJSON, mode: 'merge' | 'new') => void;
  onDiscard: () => void;
}

function PreviewGraph({ graph }: { graph: UEGraphJSON }) {
  const { nodes, edges } = useMemo(() => graphJsonToFlow(graph), [graph]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      colorMode="dark"
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesConnectable={false}
      nodesDraggable={false}
      panOnDrag
      zoomOnScroll
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.025)" gap={20} />
    </ReactFlow>
  );
}

export const GeneratePreview: FC<GeneratePreviewProps> = ({ graph, onAccept, onDiscard }) => {
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  const handleMerge = useCallback(() => onAccept(graph, 'merge'), [graph, onAccept]);
  const handleNew = useCallback(() => onAccept(graph, 'new'), [graph, onAccept]);

  return (
    <div className="ueflow-generate-preview">
      <div className="ueflow-generate-preview-header">
        <span className="ueflow-generate-preview-title">Generated Blueprint Preview</span>
        <div className="ueflow-generate-preview-summary">
          {nodeCount} node{nodeCount !== 1 ? 's' : ''}, {edgeCount} connection{edgeCount !== 1 ? 's' : ''}
        </div>
      </div>
      <div className="ueflow-generate-preview-graph">
        <ReactFlowProvider key="generate-preview">
          <PreviewGraph graph={graph} />
        </ReactFlowProvider>
      </div>
      <div className="ueflow-generate-preview-actions">
        <button className="ueflow-generate-preview-btn ueflow-generate-preview-btn--primary" onClick={handleMerge}>
          Insert into Graph
        </button>
        <button className="ueflow-generate-preview-btn ueflow-generate-preview-btn--secondary" onClick={handleNew}>
          Open as New Graph
        </button>
        <button className="ueflow-generate-preview-btn ueflow-generate-preview-btn--discard" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
};
