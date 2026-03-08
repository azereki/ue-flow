/**
 * Embed API for rendering UE Blueprint graphs in arbitrary containers.
 *
 * Supports two usage modes:
 * 1. Auto-discovery: add `class="ueflow-embed"` + data attributes to divs
 * 2. Programmatic: call `UEFlow.render()` or `UEFlow.renderT3D()`
 */
import { createRoot, type Root } from 'react-dom/client';
import { SingleGraphView } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { parseT3DToGraphJSON } from './transform/t3d-to-json';
import type { UEGraphJSON } from './types/ue-graph';

export interface EmbedOptions {
  /** CSS height for the container (default: '500px') */
  height?: string;
  /** Graph title passed to the T3D parser */
  title?: string;
}

export interface EmbedInstance {
  /** Unmount the React root and clean up */
  destroy: () => void;
}

/** Sentinel attribute to prevent double-init on auto-discovered elements */
const INIT_ATTR = 'data-ueflow-initialized';

function setupContainer(container: HTMLElement, height: string): void {
  container.style.position = 'relative';
  container.style.background = '#0f1117';
  container.style.overflow = 'hidden';
  if (!container.style.height) {
    container.style.height = height;
  }
}

function mountGraph(container: HTMLElement, graphJSON: UEGraphJSON): { root: Root } {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary embedded>
      <SingleGraphView graphJSON={graphJSON} embedded />
    </ErrorBoundary>,
  );
  return { root };
}

function mountError(container: HTMLElement, message: string): { root: Root } {
  const root = createRoot(container);
  root.render(
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1117', color: '#d4d4d8', fontFamily: 'system-ui, sans-serif', fontSize: '14px',
    }}>
      {message}
    </div>,
  );
  return { root };
}

/** Render a UEGraphJSON object into a container element. */
export function renderGraph(
  container: HTMLElement,
  graphJSON: UEGraphJSON,
  options?: EmbedOptions,
): EmbedInstance {
  const height = options?.height ?? '500px';
  setupContainer(container, height);
  const { root } = mountGraph(container, graphJSON);
  return { destroy: () => root.unmount() };
}

/** Parse T3D paste text and render the resulting graph into a container. */
export function renderT3D(
  container: HTMLElement,
  t3dText: string,
  options?: EmbedOptions,
): EmbedInstance {
  const height = options?.height ?? '500px';
  setupContainer(container, height);
  try {
    const graphJSON = parseT3DToGraphJSON(t3dText, options?.title);
    const { root } = mountGraph(container, graphJSON);
    return { destroy: () => root.unmount() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to parse T3D text';
    const { root } = mountError(container, msg);
    return { destroy: () => root.unmount() };
  }
}

/**
 * Scan the DOM for `.ueflow-embed` elements and render each one.
 *
 * Supported data attributes:
 * - `data-json` — inline UEGraphJSON string
 * - `data-json-url` — URL to fetch UEGraphJSON from
 * - `data-t3d` — inline T3D paste text
 * - `data-t3d-url` — URL to fetch T3D paste text from
 */
export function autoDiscover(): EmbedInstance[] {
  const elements = document.querySelectorAll<HTMLElement>('.ueflow-embed');
  const instances: EmbedInstance[] = [];

  for (const el of elements) {
    if (el.hasAttribute(INIT_ATTR)) continue;
    el.setAttribute(INIT_ATTR, 'true');

    const height = el.dataset.height ?? '500px';
    const title = el.dataset.title;

    // Inline JSON
    const jsonStr = el.dataset.json;
    if (jsonStr) {
      try {
        const graphJSON = JSON.parse(jsonStr) as UEGraphJSON;
        instances.push(renderGraph(el, graphJSON, { height, title }));
      } catch {
        setupContainer(el, height);
        const { root } = mountError(el, 'Failed to parse data-json attribute');
        instances.push({ destroy: () => root.unmount() });
      }
      continue;
    }

    // Inline T3D
    const t3dStr = el.dataset.t3d;
    if (t3dStr) {
      instances.push(renderT3D(el, t3dStr, { height, title }));
      continue;
    }

    // Fetch JSON from URL
    const jsonUrl = el.dataset.jsonUrl;
    if (jsonUrl) {
      setupContainer(el, height);
      const instance = { destroy: () => {} };
      fetch(jsonUrl)
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data: UEGraphJSON) => {
          const { root } = mountGraph(el, data);
          instance.destroy = () => root.unmount();
        })
        .catch((err) => {
          const { root } = mountError(el, `Failed to load JSON: ${err.message}`);
          instance.destroy = () => root.unmount();
        });
      instances.push(instance);
      continue;
    }

    // Fetch T3D from URL
    const t3dUrl = el.dataset.t3dUrl;
    if (t3dUrl) {
      setupContainer(el, height);
      const instance = { destroy: () => {} };
      fetch(t3dUrl)
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
        .then((text) => {
          const graphJSON = parseT3DToGraphJSON(text, title);
          const { root } = mountGraph(el, graphJSON);
          instance.destroy = () => root.unmount();
        })
        .catch((err) => {
          const { root } = mountError(el, `Failed to load T3D: ${err.message}`);
          instance.destroy = () => root.unmount();
        });
      instances.push(instance);
      continue;
    }
  }

  return instances;
}
