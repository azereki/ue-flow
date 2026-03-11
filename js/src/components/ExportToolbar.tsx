import { useState, useCallback, type FC } from 'react';
import { useStore } from '@xyflow/react';
import { flowToT3D } from '../transform/flow-to-t3d';
import { flowToT3DSelected } from '../transform/flow-to-t3d';
import type { AnyFlowNode, BlueprintFlowEdge, BlueprintFlowNode } from '../types/flow-types';
import { isExecPin } from '../types/pin-types';
import { useToast } from '../contexts/ToastContext';

const selectedNodeCountSelector = (state: { nodes: Array<{ selected?: boolean }> }) =>
  state.nodes.filter(n => n.selected).length;

const selectedNodeIdsSelector = (state: { nodes: Array<{ id: string; selected?: boolean }> }) =>
  state.nodes.filter(n => n.selected).map(n => n.id);

interface ExportToolbarProps {
  nodes: AnyFlowNode[];
  edges: BlueprintFlowEdge[];
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    try {
      textarea.select();
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Generate an LLM-optimized context summary from React Flow state.
 */
function generateContext(nodes: AnyFlowNode[], edges: BlueprintFlowEdge[]): string {
  const lines: string[] = [];
  lines.push('BLUEPRINT CONTEXT');
  lines.push('');

  // Execution flow — only blueprint nodes have exec pins
  const bpNodes = nodes.filter((n): n is BlueprintFlowNode => n.type === 'blueprintNode');
  const execEdges = edges.filter(e => e.data?.category === 'exec');
  const targetNodeIds = new Set(execEdges.map(e => e.target));

  // Find entry points (nodes with exec output but not targets of exec edges)
  const entryNodes = bpNodes.filter(n => {
    const hasExecOut = n.data.pins?.some(p => p.direction === 'output' && isExecPin(p.category));
    return hasExecOut && !targetNodeIds.has(n.id);
  });

  if (entryNodes.length > 0) {
    lines.push('EXECUTION FLOW:');
    for (const entry of entryNodes) {
      lines.push(`  ${entry.data.title}`);
      // BFS to follow all branches
      const queue = [entry.id];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        const nextEdges = execEdges.filter(e => e.source === current);
        for (const next of nextEdges) {
          const targetNode = bpNodes.find(n => n.id === next.target);
          if (targetNode && !visited.has(next.target)) {
            const args = targetNode.data.pins
              ?.filter(p => p.direction === 'input' && p.defaultValue && !isExecPin(p.category))
              .map(p => `${p.friendlyName || p.name}="${p.defaultValue}"`)
              .join(', ');
            lines.push(`    -> ${targetNode.data.title}${args ? `(${args})` : ''}`);
            queue.push(next.target);
          }
        }
      }
    }
    lines.push('');
  }

  // Pin values — reflects any in-canvas edits via data.pins
  const pinValues: string[] = [];
  for (const node of bpNodes) {
    for (const pin of node.data.pins) {
      if (pin.defaultValue && pin.direction === 'input' && !isExecPin(pin.category)) {
        pinValues.push(`  ${node.data.title}.${pin.friendlyName || pin.name} = "${pin.defaultValue}"`);
      }
    }
  }
  if (pinValues.length > 0) {
    lines.push('PIN VALUES:');
    lines.push(...pinValues);
    lines.push('');
  }

  // Stats
  const execCount = execEdges.length;
  const dataCount = edges.length - execCount;
  lines.push(`NODES: ${nodes.length} | CONNECTIONS: ${edges.length} (${execCount} exec, ${dataCount} data)`);

  return lines.join('\n');
}

/**
 * Generate a markdown documentation summary from React Flow state.
 */
function generateMarkdown(nodes: AnyFlowNode[], edges: BlueprintFlowEdge[]): string {
  const lines: string[] = [];
  lines.push('### Blueprint Graph');
  lines.push('');

  const bpNodes = nodes.filter((n): n is BlueprintFlowNode => n.type === 'blueprintNode');
  const execEdges = edges.filter(e => e.data?.category === 'exec');
  const targetNodeIds = new Set(execEdges.map(e => e.target));

  const entryNodes = bpNodes.filter(n => {
    const hasExecOut = n.data.pins?.some(p => p.direction === 'output' && isExecPin(p.category));
    return hasExecOut && !targetNodeIds.has(n.id);
  });

  if (entryNodes.length > 0) {
    lines.push('| Entry | Flow | Nodes |');
    lines.push('|-------|------|-------|');
    for (const entry of entryNodes) {
      // BFS to collect all reachable nodes
      const chain: string[] = [];
      const queue = [entry.id];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        const nextEdges = execEdges.filter(e => e.source === current);
        for (const next of nextEdges) {
          const targetNode = bpNodes.find(n => n.id === next.target);
          if (targetNode && !visited.has(next.target)) {
            chain.push(targetNode.data.title);
            queue.push(next.target);
          }
        }
      }
      const flow = chain.slice(0, 3).join(' -> ') + (chain.length > 3 ? ' -> ...' : '');
      lines.push(`| ${entry.data.title} | ${flow} | ${chain.length + 1} |`);
    }
    lines.push('');
  }

  lines.push(`**Nodes:** ${nodes.length} | **Connections:** ${edges.length}`);
  return lines.join('\n');
}

export const ExportToolbar: FC<ExportToolbarProps> = ({ nodes, edges }) => {
  const { showToast } = useToast();
  const [pushStatus, setPushStatus] = useState<'idle' | 'sent' | 'failed'>('idle');
  const selectedCount = useStore(selectedNodeCountSelector);
  const selectedIds = useStore(selectedNodeIdsSelector);

  const handleCopyT3D = useCallback(async () => {
    await copyToClipboard(flowToT3D(nodes, edges));
    showToast('Copied to clipboard', 'success');
  }, [nodes, edges, showToast]);

  const handleDownloadT3D = useCallback(() => {
    const t3d = flowToT3D(nodes, edges);
    const blob = new Blob([t3d], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blueprint.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [nodes, edges]);

  const handlePushToEditor = useCallback(async () => {
    const t3d = flowToT3D(nodes, edges);
    try {
      await fetch('http://localhost:9848/blueprint/import_paste_text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paste_text: t3d }),
      });
      setPushStatus('sent');
    } catch (err) {
      console.error('Push to editor failed:', err);
      setPushStatus('failed');
    }
    setTimeout(() => setPushStatus('idle'), 2000);
  }, [nodes, edges]);

  const handleCopySelected = useCallback(async () => {
    const idSet = new Set(selectedIds);
    const t3d = flowToT3DSelected(nodes, edges, idSet);
    await copyToClipboard(t3d);
    showToast(`Copied ${selectedCount} selected node${selectedCount === 1 ? '' : 's'} to clipboard`, 'success');
  }, [nodes, edges, selectedIds, selectedCount, showToast]);

  const handleCopyJSON = useCallback(async () => {
    const dataEl = document.getElementById('ue-flow-data');
    if (dataEl?.textContent) {
      await copyToClipboard(dataEl.textContent);
      showToast('Copied to clipboard', 'success');
    }
  }, [showToast]);

  const handleCopyContext = useCallback(async () => {
    await copyToClipboard(generateContext(nodes, edges));
    showToast('Copied to clipboard', 'success');
  }, [nodes, edges, showToast]);

  const handleCopyMarkdown = useCallback(async () => {
    await copyToClipboard(generateMarkdown(nodes, edges));
    showToast('Copied to clipboard', 'success');
  }, [nodes, edges, showToast]);

  return (
    <div className="ueflow-export-toolbar">
      <button className="ueflow-toolbar-btn" onClick={handleCopyT3D} title="Copy T3D to clipboard">
        <span className="ueflow-toolbar-icon">&#9113;</span>
        <span className="ueflow-toolbar-label">Copy T3D</span>
      </button>
      {selectedCount > 0 && (
        <button className="ueflow-toolbar-btn" onClick={handleCopySelected} title="Copy selected nodes as T3D">
          <span className="ueflow-toolbar-icon">&#9745;</span>
          <span className="ueflow-toolbar-label">Export Selected ({selectedCount})</span>
        </button>
      )}
      <button className="ueflow-toolbar-btn" onClick={handleDownloadT3D} title="Download as .txt file">
        <span className="ueflow-toolbar-icon">&#8615;</span>
        <span className="ueflow-toolbar-label">Download</span>
      </button>
      <button className="ueflow-toolbar-btn" onClick={handlePushToEditor} title="Push to UE Editor via bridge">
        <span className="ueflow-toolbar-icon">&#9654;</span>
        <span className="ueflow-toolbar-label">{pushStatus === 'sent' ? 'Sent!' : pushStatus === 'failed' ? 'Failed' : 'Push'}</span>
      </button>
      <button className="ueflow-toolbar-btn" onClick={handleCopyContext} title="Copy LLM context summary">
        <span className="ueflow-toolbar-icon">&#9998;</span>
        <span className="ueflow-toolbar-label">Context</span>
      </button>
      <button className="ueflow-toolbar-btn" onClick={handleCopyMarkdown} title="Copy markdown documentation">
        <span className="ueflow-toolbar-icon">&#9776;</span>
        <span className="ueflow-toolbar-label">Markdown</span>
      </button>
      <button className="ueflow-toolbar-btn ueflow-toolbar-btn--secondary" onClick={handleCopyJSON} title="Copy graph JSON">
        <span className="ueflow-toolbar-icon">{'{}'}</span>
        <span className="ueflow-toolbar-label">JSON</span>
      </button>
    </div>
  );
};
