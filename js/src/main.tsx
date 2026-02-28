import { createRoot } from 'react-dom/client';
import { App } from './App';
import type { UEGraphJSON } from './types/ue-graph';

function loadGraphJSON(): UEGraphJSON | null {
  // Production: read from embedded <script type="application/json" id="ue-flow-data">
  const dataEl = document.getElementById('ue-flow-data');
  if (dataEl?.textContent) {
    try {
      return JSON.parse(dataEl.textContent);
    } catch {
      console.error('Failed to parse ue-flow graph JSON');
    }
  }
  return null;
}

const graph = loadGraphJSON();
const container = document.getElementById('ue-flow-root');
if (container) {
  createRoot(container).render(<App graphJSON={graph} />);
}
