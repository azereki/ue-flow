import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIProviderProvider } from './contexts/AIProviderContext';
import { renderGraph, renderT3D, autoDiscover } from './embed';
import type { UEGraphJSON, UEMultiGraphJSON } from './types/ue-graph';

// ---------------------------------------------------------------------------
// Legacy auto-init: mount full App when #ue-flow-root exists (backward compat
// with Python renderer, paste-tool.html, etc.)
// ---------------------------------------------------------------------------

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

const rootContainer = document.getElementById('ue-flow-root');
if (rootContainer) {
  const multiGraph = loadMultiGraphJSON();
  const singleGraph = loadGraphJSON();
  createRoot(rootContainer).render(
    <ErrorBoundary>
      <AIProviderProvider>
        <App graphJSON={singleGraph} multiGraphJSON={multiGraph} />
      </AIProviderProvider>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Public embed API — available as window.UEFlow after IIFE loads
// ---------------------------------------------------------------------------

const UEFlow = {
  render: renderGraph,
  renderT3D,
  autoDiscover,
};

(window as unknown as Record<string, unknown>).UEFlow = UEFlow;

// Auto-discover .ueflow-embed elements once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => autoDiscover());
} else {
  autoDiscover();
}
