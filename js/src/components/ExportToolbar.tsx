import { useCallback, type FC } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { flowToT3D } from '../transform/flow-to-t3d';

interface ExportToolbarProps {
  nodes: Node[];
  edges: Edge[];
}

export const ExportToolbar: FC<ExportToolbarProps> = ({ nodes, edges }) => {
  const handleCopyT3D = useCallback(async () => {
    const t3d = flowToT3D(nodes, edges);
    try {
      await navigator.clipboard.writeText(t3d);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = t3d;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, [nodes, edges]);

  const handleDownloadT3D = useCallback(() => {
    const t3d = flowToT3D(nodes, edges);
    const blob = new Blob([t3d], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blueprint.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handlePushToEditor = useCallback(async () => {
    const t3d = flowToT3D(nodes, edges);
    try {
      const response = await fetch('http://localhost:9848/blueprint/import_paste_text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paste_text: t3d }),
      });
      if (!response.ok) {
        console.error('Push to editor failed:', response.statusText);
      }
    } catch (err) {
      console.error('Push to editor failed:', err);
    }
  }, [nodes, edges]);

  const handleCopyJSON = useCallback(async () => {
    // Read the original graph JSON from the page
    const dataEl = document.getElementById('ue-flow-data');
    if (dataEl?.textContent) {
      try {
        await navigator.clipboard.writeText(dataEl.textContent);
      } catch {
        // Fallback
      }
    }
  }, []);

  return (
    <div className="ueflow-export-toolbar">
      <button className="ueflow-toolbar-btn" onClick={handleCopyT3D} title="Copy T3D to clipboard">
        Copy T3D
      </button>
      <button className="ueflow-toolbar-btn" onClick={handleDownloadT3D} title="Download as .txt file">
        Download
      </button>
      <button className="ueflow-toolbar-btn" onClick={handlePushToEditor} title="Push to UE Editor via bridge">
        Push to Editor
      </button>
      <button className="ueflow-toolbar-btn ueflow-toolbar-btn--secondary" onClick={handleCopyJSON} title="Copy graph JSON">
        Copy JSON
      </button>
    </div>
  );
};
