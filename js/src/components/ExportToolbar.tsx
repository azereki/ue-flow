import { useState, useCallback, type FC } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { flowToT3D } from '../transform/flow-to-t3d';
import type { FlowNodeData } from '../transform/json-to-flow';
import { isExecPin } from '../types/pin-types';

interface ExportToolbarProps {
  nodes: Node[];
  edges: Edge[];
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
function generateContext(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = [];
  lines.push('BLUEPRINT CONTEXT');
  lines.push('');

  // Execution flow
  const execEdges = edges.filter(e => (e.data as { category?: string })?.category === 'exec');
  const targetNodes = new Set(execEdges.map(e => e.target));

  // Find entry points (nodes with exec output but not targets of exec edges)
  const entryNodes = nodes.filter(n => {
    const data = n.data as FlowNodeData;
    if (!data) return false;
    const hasExecOut = data.pins?.some(p => p.direction === 'output' && isExecPin(p.category));
    return hasExecOut && !targetNodes.has(n.id);
  });

  if (entryNodes.length > 0) {
    lines.push('EXECUTION FLOW:');
    for (const entry of entryNodes) {
      const data = entry.data as FlowNodeData;
      lines.push(`  ${data.title}`);
      // BFS to follow all branches
      const queue = [entry.id];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        const nextEdges = execEdges.filter(e => e.source === current);
        for (const next of nextEdges) {
          const targetNode = nodes.find(n => n.id === next.target);
          if (targetNode && !visited.has(next.target)) {
            const td = targetNode.data as FlowNodeData;
            const args = td.pins
              ?.filter(p => p.direction === 'input' && p.defaultValue && !isExecPin(p.category))
              .map(p => `${p.friendlyName || p.name}="${p.defaultValue}"`)
              .join(', ');
            lines.push(`    -> ${td.title}${args ? `(${args})` : ''}`);
            queue.push(next.target);
          }
        }
      }
    }
    lines.push('');
  }

  // Pin values
  const pinValues: string[] = [];
  for (const node of nodes) {
    const data = node.data as FlowNodeData;
    if (!data?.pins) continue;
    for (const pin of data.pins) {
      if (pin.defaultValue && pin.direction === 'input' && !isExecPin(pin.category)) {
        pinValues.push(`  ${data.title}.${pin.friendlyName || pin.name} = "${pin.defaultValue}"`);
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
function generateMarkdown(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = [];
  lines.push('### Blueprint Graph');
  lines.push('');

  const execEdges = edges.filter(e => (e.data as { category?: string })?.category === 'exec');
  const targetNodes = new Set(execEdges.map(e => e.target));

  const entryNodes = nodes.filter(n => {
    const data = n.data as FlowNodeData;
    if (!data) return false;
    const hasExecOut = data.pins?.some(p => p.direction === 'output' && isExecPin(p.category));
    return hasExecOut && !targetNodes.has(n.id);
  });

  if (entryNodes.length > 0) {
    lines.push('| Entry | Flow | Nodes |');
    lines.push('|-------|------|-------|');
    for (const entry of entryNodes) {
      const data = entry.data as FlowNodeData;
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
          const targetNode = nodes.find(n => n.id === next.target);
          if (targetNode && !visited.has(next.target)) {
            chain.push((targetNode.data as FlowNodeData).title);
            queue.push(next.target);
          }
        }
      }
      const flow = chain.slice(0, 3).join(' -> ') + (chain.length > 3 ? ' -> ...' : '');
      lines.push(`| ${data.title} | ${flow} | ${chain.length + 1} |`);
    }
    lines.push('');
  }

  lines.push(`**Nodes:** ${nodes.length} | **Connections:** ${edges.length}`);
  return lines.join('\n');
}

export const ExportToolbar: FC<ExportToolbarProps> = ({ nodes, edges }) => {
  const handleCopyT3D = useCallback(async () => {
    await copyToClipboard(flowToT3D(nodes, edges));
  }, [nodes, edges]);

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

  const [pushStatus, setPushStatus] = useState<'idle' | 'sent' | 'failed'>('idle');

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

  const handleCopyJSON = useCallback(async () => {
    const dataEl = document.getElementById('ue-flow-data');
    if (dataEl?.textContent) {
      await copyToClipboard(dataEl.textContent);
    }
  }, []);

  const handleCopyContext = useCallback(async () => {
    await copyToClipboard(generateContext(nodes, edges));
  }, [nodes, edges]);

  const handleCopyMarkdown = useCallback(async () => {
    await copyToClipboard(generateMarkdown(nodes, edges));
  }, [nodes, edges]);

  return (
    <div className="ueflow-export-toolbar">
      <button className="ueflow-toolbar-btn" onClick={handleCopyT3D} title="Copy T3D to clipboard">
        Copy T3D
      </button>
      <button className="ueflow-toolbar-btn" onClick={handleDownloadT3D} title="Download as .txt file">
        Download
      </button>
      <button className="ueflow-toolbar-btn" onClick={handlePushToEditor} title="Push to UE Editor via bridge">
        {pushStatus === 'sent' ? 'Sent!' : pushStatus === 'failed' ? 'Failed' : 'Push to Editor'}
      </button>
      <button className="ueflow-toolbar-btn" onClick={handleCopyContext} title="Copy LLM context summary">
        Copy as Context
      </button>
      <button className="ueflow-toolbar-btn" onClick={handleCopyMarkdown} title="Copy markdown documentation">
        Copy as Markdown
      </button>
      <button className="ueflow-toolbar-btn ueflow-toolbar-btn--secondary" onClick={handleCopyJSON} title="Copy graph JSON">
        Copy JSON
      </button>
    </div>
  );
};
