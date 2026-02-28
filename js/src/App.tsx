import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './theme/ue-flow.css';
import { graphJsonToFlow } from './transform/json-to-flow';
import { BlueprintNode } from './nodes/BlueprintNode';
import { BlueprintEdge } from './edges/BlueprintEdge';
import type { UEGraphJSON } from './types/ue-graph';

const nodeTypes = { blueprintNode: BlueprintNode };
const edgeTypes = { blueprintEdge: BlueprintEdge };

interface AppProps {
  graphJSON: UEGraphJSON | null;
}

export function App({ graphJSON }: AppProps) {
  const { nodes, edges } = useMemo(
    () => graphJSON ? graphJsonToFlow(graphJSON) : { nodes: [], edges: [] },
    [graphJSON],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1d27" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={() => '#2a2d37'}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
