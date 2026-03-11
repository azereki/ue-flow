/**
 * GraphDiffView — side-by-side / unified diff view for comparing two graphs.
 *
 * Shows a summary header, collapsible sections for added/removed/modified
 * nodes and edges, with green/red diff coloring on a dark theme.
 */
import React, { useState, useCallback } from 'react';
import type { GraphDiff } from '../utils/graph-diff';
import type { UENode, UEEdge } from '../types/ue-graph';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GraphDiffViewProps {
  diff: GraphDiff;
  graphAName: string;
  graphBName: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function DiffSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="ueflow-diff-section">
      <button
        className="ueflow-diff-section-header"
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span className="ueflow-diff-chevron">{open ? '\u25BC' : '\u25B6'}</span>
        <span>{title}</span>
        <span className="ueflow-diff-badge">{count}</span>
      </button>
      {open && <div className="ueflow-diff-section-body">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NodeCard({
  node,
  variant,
}: {
  node: UENode;
  variant: 'added' | 'removed';
}) {
  const cls = variant === 'added' ? 'ueflow-diff-card--added' : 'ueflow-diff-card--removed';
  return (
    <div className={`ueflow-diff-card ${cls}`}>
      <div className="ueflow-diff-card-header">
        <span className="ueflow-diff-card-icon">{variant === 'added' ? '+' : '\u2212'}</span>
        <span className="ueflow-diff-card-title">{node.title}</span>
        <span className="ueflow-diff-card-type">{node.type}</span>
      </div>
      <div className="ueflow-diff-card-meta">
        ID: {node.id} &middot; Class: {node.nodeClass.split('.').pop()}
      </div>
    </div>
  );
}

function EdgeCard({
  edge,
  variant,
}: {
  edge: UEEdge;
  variant: 'added' | 'removed';
}) {
  const cls = variant === 'added' ? 'ueflow-diff-card--added' : 'ueflow-diff-card--removed';
  return (
    <div className={`ueflow-diff-card ${cls}`}>
      <div className="ueflow-diff-card-header">
        <span className="ueflow-diff-card-icon">{variant === 'added' ? '+' : '\u2212'}</span>
        <span className="ueflow-diff-card-title">
          {edge.source}:{edge.sourcePin} &rarr; {edge.target}:{edge.targetPin}
        </span>
        <span className="ueflow-diff-card-type">{edge.category}</span>
      </div>
    </div>
  );
}

function ModifiedNodeCard({
  entry,
}: {
  entry: GraphDiff['modifiedNodes'][number];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="ueflow-diff-card ueflow-diff-card--modified">
      <button
        className="ueflow-diff-card-header ueflow-diff-card-header--clickable"
        onClick={() => setExpanded(e => !e)}
        type="button"
      >
        <span className="ueflow-diff-card-icon">{'\u270E'}</span>
        <span className="ueflow-diff-card-title">{entry.title}</span>
        <span className="ueflow-diff-badge">{entry.changes.length} change{entry.changes.length !== 1 ? 's' : ''}</span>
      </button>
      {expanded && (
        <div className="ueflow-diff-changes">
          {entry.changes.map((c, i) => (
            <div key={i} className="ueflow-diff-change-row">
              <span className="ueflow-diff-change-field">{c.field}</span>
              <span className="ueflow-diff-change-old">{c.oldValue}</span>
              <span className="ueflow-diff-change-arrow">&rarr;</span>
              <span className="ueflow-diff-change-new">{c.newValue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const GraphDiffView: React.FC<GraphDiffViewProps> = ({
  diff,
  graphAName,
  graphBName,
  onClose,
}) => {
  const { summary } = diff;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  if (summary.totalChanges === 0) {
    return (
      <div className="ueflow-diff-overlay" onKeyDown={handleKeyDown} tabIndex={-1}>
        <div className="ueflow-diff-panel">
          <div className="ueflow-diff-toolbar">
            <span className="ueflow-diff-toolbar-title">
              {graphAName} vs {graphBName}
            </span>
            <button className="ueflow-diff-close" onClick={onClose} type="button">
              &times;
            </button>
          </div>
          <div className="ueflow-diff-empty">No differences found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ueflow-diff-overlay" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="ueflow-diff-panel">
        {/* Toolbar */}
        <div className="ueflow-diff-toolbar">
          <span className="ueflow-diff-toolbar-title">
            {graphAName} vs {graphBName}
          </span>
          <button className="ueflow-diff-close" onClick={onClose} type="button">
            &times;
          </button>
        </div>

        {/* Summary bar */}
        <div className="ueflow-diff-summary">
          {summary.addedCount > 0 && (
            <span className="ueflow-diff-summary-added">
              +{summary.addedCount} added
            </span>
          )}
          {summary.removedCount > 0 && (
            <span className="ueflow-diff-summary-removed">
              &minus;{summary.removedCount} removed
            </span>
          )}
          {summary.modifiedCount > 0 && (
            <span className="ueflow-diff-summary-modified">
              ~{summary.modifiedCount} modified
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="ueflow-diff-content">
          <DiffSection title="Added Nodes" count={diff.addedNodes.length}>
            {diff.addedNodes.map(n => (
              <NodeCard key={n.id} node={n} variant="added" />
            ))}
          </DiffSection>

          <DiffSection title="Removed Nodes" count={diff.removedNodes.length}>
            {diff.removedNodes.map(n => (
              <NodeCard key={n.id} node={n} variant="removed" />
            ))}
          </DiffSection>

          <DiffSection title="Modified Nodes" count={diff.modifiedNodes.length}>
            {diff.modifiedNodes.map(m => (
              <ModifiedNodeCard key={m.nodeId} entry={m} />
            ))}
          </DiffSection>

          <DiffSection title="Added Edges" count={diff.addedEdges.length}>
            {diff.addedEdges.map(e => (
              <EdgeCard key={e.id} edge={e} variant="added" />
            ))}
          </DiffSection>

          <DiffSection title="Removed Edges" count={diff.removedEdges.length}>
            {diff.removedEdges.map(e => (
              <EdgeCard key={e.id} edge={e} variant="removed" />
            ))}
          </DiffSection>
        </div>
      </div>
    </div>
  );
};
