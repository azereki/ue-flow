import { useMemo, type FC } from 'react';
import type { AnyFlowNode, BlueprintFlowEdge, BlueprintFlowNode } from '../types/flow-types';
import { findExecRoots, findReachableNodes } from '../utils/exec-graph';

export interface GraphStatsPanelProps {
  nodes: AnyFlowNode[];
  edges: BlueprintFlowEdge[];
  isOpen: boolean;
  onToggle: () => void;
}

interface NodeBreakdown {
  events: number;
  functions: number;
  variableGet: number;
  variableSet: number;
  comments: number;
  other: number;
}

function getComplexityLabel(score: number): string {
  if (score < 20) return 'Low';
  if (score < 60) return 'Medium';
  if (score < 120) return 'High';
  return 'Very High';
}

function getComplexityColor(score: number): string {
  if (score < 20) return '#4caf50';
  if (score < 60) return '#ff9800';
  if (score < 120) return '#f44336';
  return '#d32f2f';
}

export const GraphStatsPanel: FC<GraphStatsPanelProps> = ({ nodes, edges, isOpen, onToggle }) => {
  const stats = useMemo(() => {
    // Node breakdown
    const breakdown: NodeBreakdown = {
      events: 0,
      functions: 0,
      variableGet: 0,
      variableSet: 0,
      comments: 0,
      other: 0,
    };

    for (const node of nodes) {
      if (node.type === 'commentNode') {
        breakdown.comments++;
        continue;
      }
      const data = (node as BlueprintFlowNode).data;
      const ueType = data.ueType;
      const cls = data.nodeClass.includes('.') ? data.nodeClass.split('.').pop()! : data.nodeClass;

      if (ueType === 'event' || ueType === 'component_event' || ueType === 'input') {
        breakdown.events++;
      } else if (cls === 'K2Node_VariableGet') {
        breakdown.variableGet++;
      } else if (cls === 'K2Node_VariableSet') {
        breakdown.variableSet++;
      } else if (
        ueType === 'function' ||
        cls === 'K2Node_CallFunction' ||
        cls === 'K2Node_FunctionEntry' ||
        cls === 'K2Node_FunctionResult'
      ) {
        breakdown.functions++;
      } else {
        breakdown.other++;
      }
    }

    // Edge breakdown
    const execEdges = edges.filter(e => e.data?.category === 'exec').length;
    const dataEdges = edges.length - execEdges;

    // Complexity
    const complexityScore = nodes.length + edges.length * 0.5;
    const complexityLabel = getComplexityLabel(complexityScore);
    const complexityColor = getComplexityColor(complexityScore);

    // Unreachable nodes
    const roots = findExecRoots(nodes);
    const reachable = findReachableNodes(roots, nodes, edges);
    // Only count blueprint nodes (not comments) that are unreachable
    const unreachableCount = nodes.filter(
      n => n.type === 'blueprintNode' && !reachable.has(n.id),
    ).length;

    return {
      totalNodes: nodes.length,
      breakdown,
      totalEdges: edges.length,
      execEdges,
      dataEdges,
      complexityScore: Math.round(complexityScore),
      complexityLabel,
      complexityColor,
      unreachableCount,
    };
  }, [nodes, edges]);

  return (
    <div className={`ueflow-stats-panel ${isOpen ? 'ueflow-stats-panel--open' : ''}`}>
      <button className="ueflow-stats-panel__toggle" onClick={onToggle}>
        <span className="ueflow-stats-panel__toggle-icon">{isOpen ? '\u25BC' : '\u25B6'}</span>
        <span>Graph Statistics</span>
      </button>

      {isOpen && (
        <div className="ueflow-stats-panel__body">
          {/* Node counts */}
          <div className="ueflow-stats-panel__section">
            <div className="ueflow-stats-panel__section-title">Nodes</div>
            <div className="ueflow-stats-panel__row">
              <span>Total</span>
              <span className="ueflow-stats-panel__value">{stats.totalNodes}</span>
            </div>
            {stats.breakdown.events > 0 && (
              <div className="ueflow-stats-panel__row ueflow-stats-panel__row--sub">
                <span>Events</span>
                <span className="ueflow-stats-panel__value">{stats.breakdown.events}</span>
              </div>
            )}
            {stats.breakdown.functions > 0 && (
              <div className="ueflow-stats-panel__row ueflow-stats-panel__row--sub">
                <span>Functions</span>
                <span className="ueflow-stats-panel__value">{stats.breakdown.functions}</span>
              </div>
            )}
            {stats.breakdown.variableGet > 0 && (
              <div className="ueflow-stats-panel__row ueflow-stats-panel__row--sub">
                <span>Variable Get</span>
                <span className="ueflow-stats-panel__value">{stats.breakdown.variableGet}</span>
              </div>
            )}
            {stats.breakdown.variableSet > 0 && (
              <div className="ueflow-stats-panel__row ueflow-stats-panel__row--sub">
                <span>Variable Set</span>
                <span className="ueflow-stats-panel__value">{stats.breakdown.variableSet}</span>
              </div>
            )}
            {stats.breakdown.comments > 0 && (
              <div className="ueflow-stats-panel__row ueflow-stats-panel__row--sub">
                <span>Comments</span>
                <span className="ueflow-stats-panel__value">{stats.breakdown.comments}</span>
              </div>
            )}
            {stats.breakdown.other > 0 && (
              <div className="ueflow-stats-panel__row ueflow-stats-panel__row--sub">
                <span>Other</span>
                <span className="ueflow-stats-panel__value">{stats.breakdown.other}</span>
              </div>
            )}
          </div>

          {/* Connection counts */}
          <div className="ueflow-stats-panel__section">
            <div className="ueflow-stats-panel__section-title">Connections</div>
            <div className="ueflow-stats-panel__row">
              <span>Total</span>
              <span className="ueflow-stats-panel__value">{stats.totalEdges}</span>
            </div>
            <div className="ueflow-stats-panel__row ueflow-stats-panel__row--sub">
              <span>Exec</span>
              <span className="ueflow-stats-panel__value">{stats.execEdges}</span>
            </div>
            <div className="ueflow-stats-panel__row ueflow-stats-panel__row--sub">
              <span>Data</span>
              <span className="ueflow-stats-panel__value">{stats.dataEdges}</span>
            </div>
          </div>

          {/* Complexity */}
          <div className="ueflow-stats-panel__section">
            <div className="ueflow-stats-panel__section-title">Complexity</div>
            <div className="ueflow-stats-panel__row">
              <span>Score</span>
              <span
                className="ueflow-stats-panel__value"
                style={{ color: stats.complexityColor }}
              >
                {stats.complexityScore} ({stats.complexityLabel})
              </span>
            </div>
          </div>

          {/* Warnings */}
          {stats.unreachableCount > 0 && (
            <div className="ueflow-stats-panel__section ueflow-stats-panel__section--warning">
              <div className="ueflow-stats-panel__section-title">Warnings</div>
              <div className="ueflow-stats-panel__row">
                <span>Unreachable nodes</span>
                <span className="ueflow-stats-panel__value ueflow-stats-panel__value--warning">
                  {stats.unreachableCount}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
