import type { FC } from 'react';

interface StatusBarProps {
  activeGraph: string;
  nodeCount: number;
  variableCount: number;
  functionCount: number;
  graphCount: number;
  comparison?: { reductionPercent?: number } | null;
}

export const StatusBar: FC<StatusBarProps> = ({
  activeGraph,
  nodeCount,
  variableCount,
  functionCount,
  graphCount,
  comparison,
}) => {
  return (
    <div className="ueflow-statusbar">
      <span className="ueflow-statusbar-left">
        Graph: {activeGraph} | Nodes: {nodeCount}
      </span>
      <span className="ueflow-statusbar-right">
        Variables: {variableCount} | Functions: {functionCount} | Graphs: {graphCount}
        {comparison?.reductionPercent != null && (
          <> | Reduction: {comparison.reductionPercent.toFixed(1)}%</>
        )}
      </span>
    </div>
  );
};
