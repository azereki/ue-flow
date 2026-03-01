import type { FC } from 'react';

interface StatusBarProps {
  activeGraph: string;
  nodeCount: number;
  variableCount: number;
  functionCount: number;
  graphCount: number;
  comparison?: Record<string, { before: number; after: number }>;
  selectedNode?: string | null;
}

export const StatusBar: FC<StatusBarProps> = ({
  activeGraph,
  nodeCount,
  variableCount,
  functionCount,
  graphCount,
  comparison,
  selectedNode,
}) => {
  // Compute overall reduction if comparison data exists
  const reductionPercent = comparison ? (() => {
    const entries = Object.values(comparison);
    if (entries.length === 0) return null;
    const totalBefore = entries.reduce((sum, e) => sum + e.before, 0);
    const totalAfter = entries.reduce((sum, e) => sum + e.after, 0);
    if (totalBefore === 0) return null;
    return ((totalBefore - totalAfter) / totalBefore) * 100;
  })() : null;

  return (
    <div className="ueflow-statusbar">
      <span className="ueflow-statusbar-left">
        Graph: {activeGraph} | Nodes: {nodeCount}
        {selectedNode && <> | Selected: {selectedNode}</>}
      </span>
      <span className="ueflow-statusbar-right">
        Variables: {variableCount} | Functions: {functionCount} | Graphs: {graphCount}
        {reductionPercent != null && (
          <> | Reduction: {reductionPercent.toFixed(1)}%</>
        )}
      </span>
    </div>
  );
};
