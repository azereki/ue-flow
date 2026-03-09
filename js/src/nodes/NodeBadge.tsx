/**
 * Small diagnostic badge shown at the top-right of a node header.
 * Red circle for errors, yellow triangle for warnings.
 */
import type { FC } from 'react';
import type { Diagnostic } from '../utils/node-diagnostics';

interface NodeBadgeProps {
  diagnostics: Diagnostic[];
}

export const NodeBadge: FC<NodeBadgeProps> = ({ diagnostics }) => {
  if (diagnostics.length === 0) return null;

  const hasError = diagnostics.some((d) => d.severity === 'error');
  const tooltip = diagnostics.map((d) => `[${d.severity}] ${d.message}`).join('\n');

  return (
    <span
      className={`ueflow-node-badge ${hasError ? 'ueflow-node-badge--error' : 'ueflow-node-badge--warning'}`}
      title={tooltip}
    >
      {hasError ? '!' : '?'}
    </span>
  );
};
