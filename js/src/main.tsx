import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { UEGraphJSON, UEMultiGraphJSON } from './types/ue-graph';

function loadGraphJSON(): UEGraphJSON | null {
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

function loadMultiGraphJSON(): UEMultiGraphJSON | null {
  const dataEl = document.getElementById('ue-flow-multi-data');
  if (dataEl?.textContent) {
    try {
      return JSON.parse(dataEl.textContent);
    } catch {
      console.error('Failed to parse ue-flow multi-graph JSON');
    }
  }
  return null;
}

const multiGraph = loadMultiGraphJSON();
const singleGraph = loadGraphJSON();

const container = document.getElementById('ue-flow-root');
if (container) {
  createRoot(container).render(
    <ErrorBoundary>
      <App graphJSON={singleGraph} multiGraphJSON={multiGraph} />
    </ErrorBoundary>
  );
} else {
  console.error('ue-flow: #ue-flow-root element not found');
}
