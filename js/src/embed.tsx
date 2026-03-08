/**
 * Embed API for rendering UE Blueprint graphs in arbitrary containers.
 *
 * Supports two usage modes:
 * 1. Auto-discovery: add `class="ueflow-embed"` + data attributes to divs
 * 2. Programmatic: call `UEFlow.render()` or `UEFlow.renderT3D()`
 */
import { createRoot, type Root } from 'react-dom/client';
import { SingleGraphView, type DisplayOptions } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { parseT3DToGraphJSON } from './transform/t3d-to-json';
import type { UEGraphJSON } from './types/ue-graph';

export interface EmbedOptions {
  /** CSS height for the container (default: '500px') */
  height?: string;
  /** Graph title passed to the T3D parser */
  title?: string;

  // Callbacks
  /** Called after the graph mounts and fit-view completes */
  onLoad?: (instance: EmbedInstance) => void;
  /** Called when a parse or render error occurs */
  onError?: (error: Error) => void;
  /** Called when the user selects or deselects a node */
  onSelectionChange?: (nodeTitle: string | null) => void;

  // UI chrome toggles (all default true)
  /** Show zoom/fit controls (default: true) */
  showControls?: boolean;
  /** Show minimap (default: true) */
  showMiniMap?: boolean;
  /** Show export toolbar (default: true) */
  showExportToolbar?: boolean;
  /** Show zoom percentage indicator (default: true) */
  showZoomIndicator?: boolean;

  // Theming
  /** Container background color (default: '#0f1117') */
  backgroundColor?: string;
  /** Accent color override for --uf-accent CSS variable */
  accentColor?: string;

  // Performance
  /** Defer rendering until the container scrolls into view (default: false) */
  lazy?: boolean;
}

export interface EmbedInstance {
  /** Unmount the React root and clean up */
  destroy: () => void;
  /** The container element this instance is rendered into */
  readonly container: HTMLElement;
}

/** Sentinel attribute to prevent double-init on auto-discovered elements */
const INIT_ATTR = 'data-ueflow-initialized';

function setupContainer(container: HTMLElement, options: EmbedOptions): void {
  const height = options.height ?? '500px';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  if (!container.style.height) {
    container.style.height = height;
  }
  // Theming: apply CSS custom properties for cascade override
  const bg = options.backgroundColor ?? '#0f1117';
  container.style.background = bg;
  container.style.setProperty('--uf-bg', bg);
  if (options.accentColor) {
    container.style.setProperty('--uf-accent', options.accentColor);
  }
}

function buildDisplayOptions(options?: EmbedOptions): DisplayOptions | undefined {
  if (!options) return undefined;
  const { showControls, showMiniMap, showExportToolbar, showZoomIndicator } = options;
  if (showControls === undefined && showMiniMap === undefined &&
      showExportToolbar === undefined && showZoomIndicator === undefined) {
    return undefined;
  }
  return { showControls, showMiniMap, showExportToolbar, showZoomIndicator };
}

function mountGraph(
  container: HTMLElement,
  graphJSON: UEGraphJSON,
  options?: EmbedOptions,
): { root: Root } {
  const root = createRoot(container);
  const displayOptions = buildDisplayOptions(options);
  const instance: EmbedInstance = { destroy: () => root.unmount(), container };

  root.render(
    <ErrorBoundary embedded onError={options?.onError}>
      <SingleGraphView
        graphJSON={graphJSON}
        embedded
        displayOptions={displayOptions}
        onSelectedNodeChange={options?.onSelectionChange}
        onReady={() => options?.onLoad?.(instance)}
      />
    </ErrorBoundary>,
  );
  return { root };
}

function mountError(container: HTMLElement, message: string, onError?: (error: Error) => void): { root: Root } {
  const root = createRoot(container);
  if (onError) {
    onError(new Error(message));
  }
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

function lazyMount(
  container: HTMLElement,
  doMount: () => EmbedInstance,
): EmbedInstance {
  let inner: EmbedInstance | null = null;

  const placeholder = document.createElement('div');
  placeholder.style.cssText =
    'width:100%;height:100%;display:flex;align-items:center;justify-content:center;' +
    'color:#71717a;font-family:system-ui,sans-serif;font-size:14px;';
  placeholder.textContent = 'Blueprint graph \u2014 scroll to load';
  container.appendChild(placeholder);

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        observer.disconnect();
        placeholder.remove();
        inner = doMount();
      }
    },
    { rootMargin: '200px' },
  );
  observer.observe(container);

  return {
    container,
    destroy: () => {
      observer.disconnect();
      placeholder.remove();
      inner?.destroy();
    },
  };
}

/** Render a UEGraphJSON object into a container element. */
export function renderGraph(
  container: HTMLElement,
  graphJSON: UEGraphJSON,
  options?: EmbedOptions,
): EmbedInstance {
  setupContainer(container, options ?? {});
  if (options?.lazy) {
    return lazyMount(container, () => {
      const { root } = mountGraph(container, graphJSON, options);
      return { destroy: () => root.unmount(), container };
    });
  }
  const { root } = mountGraph(container, graphJSON, options);
  return { destroy: () => root.unmount(), container };
}

/** Parse T3D paste text and render the resulting graph into a container. */
export function renderT3D(
  container: HTMLElement,
  t3dText: string,
  options?: EmbedOptions,
): EmbedInstance {
  setupContainer(container, options ?? {});
  const doMount = () => {
    try {
      const graphJSON = parseT3DToGraphJSON(t3dText, options?.title);
      const { root } = mountGraph(container, graphJSON, options);
      return { destroy: () => root.unmount(), container } as EmbedInstance;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse T3D text';
      const { root } = mountError(container, msg, options?.onError);
      return { destroy: () => root.unmount(), container } as EmbedInstance;
    }
  };
  if (options?.lazy) {
    return lazyMount(container, doMount);
  }
  return doMount();
}

/** Parse boolean-ish data attribute (absent or any value other than 'false' → true). */
function boolAttr(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value !== 'false';
}

/**
 * Scan the DOM for `.ueflow-embed` elements and render each one.
 *
 * Supported data attributes:
 * - `data-json` — inline UEGraphJSON string
 * - `data-json-url` — URL to fetch UEGraphJSON from
 * - `data-t3d` — inline T3D paste text
 * - `data-t3d-url` — URL to fetch T3D paste text from
 * - `data-height` — CSS height (default: '500px')
 * - `data-title` — graph title
 * - `data-show-controls` — show zoom controls ('true'/'false')
 * - `data-show-minimap` — show minimap ('true'/'false')
 * - `data-show-export-toolbar` — show export toolbar ('true'/'false')
 * - `data-show-zoom-indicator` — show zoom indicator ('true'/'false')
 * - `data-background-color` — container background color
 * - `data-accent-color` — accent color override
 * - `data-lazy` — defer rendering until scrolled into view ('true'/'false')
 */
export function autoDiscover(): EmbedInstance[] {
  const elements = document.querySelectorAll<HTMLElement>('.ueflow-embed');
  const instances: EmbedInstance[] = [];

  for (const el of elements) {
    if (el.hasAttribute(INIT_ATTR)) continue;
    el.setAttribute(INIT_ATTR, 'true');

    const opts: EmbedOptions = {
      height: el.dataset.height ?? '500px',
      title: el.dataset.title,
      showControls: boolAttr(el.dataset.showControls),
      showMiniMap: boolAttr(el.dataset.showMinimap),
      showExportToolbar: boolAttr(el.dataset.showExportToolbar),
      showZoomIndicator: boolAttr(el.dataset.showZoomIndicator),
      backgroundColor: el.dataset.backgroundColor,
      accentColor: el.dataset.accentColor,
      lazy: el.dataset.lazy === 'true',
    };

    // Inline JSON
    const jsonStr = el.dataset.json;
    if (jsonStr) {
      try {
        const graphJSON = JSON.parse(jsonStr) as UEGraphJSON;
        instances.push(renderGraph(el, graphJSON, opts));
      } catch {
        setupContainer(el, opts);
        const { root } = mountError(el, 'Failed to parse data-json attribute');
        instances.push({ destroy: () => root.unmount(), container: el });
      }
      continue;
    }

    // Inline T3D
    const t3dStr = el.dataset.t3d;
    if (t3dStr) {
      instances.push(renderT3D(el, t3dStr, opts));
      continue;
    }

    // Fetch JSON from URL
    const jsonUrl = el.dataset.jsonUrl;
    if (jsonUrl) {
      setupContainer(el, opts);
      const doFetchMount = () => {
        const instance: EmbedInstance = { destroy: () => {}, container: el };
        fetch(jsonUrl)
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
          .then((data: UEGraphJSON) => {
            const { root } = mountGraph(el, data, opts);
            instance.destroy = () => root.unmount();
          })
          .catch((err) => {
            const { root } = mountError(el, `Failed to load JSON: ${err.message}`, opts.onError);
            instance.destroy = () => root.unmount();
          });
        return instance;
      };
      if (opts.lazy) {
        instances.push(lazyMount(el, doFetchMount));
      } else {
        instances.push(doFetchMount());
      }
      continue;
    }

    // Fetch T3D from URL
    const t3dUrl = el.dataset.t3dUrl;
    if (t3dUrl) {
      setupContainer(el, opts);
      const doFetchMount = () => {
        const instance: EmbedInstance = { destroy: () => {}, container: el };
        fetch(t3dUrl)
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
          .then((text) => {
            const graphJSON = parseT3DToGraphJSON(text, opts.title);
            const { root } = mountGraph(el, graphJSON, opts);
            instance.destroy = () => root.unmount();
          })
          .catch((err) => {
            const { root } = mountError(el, `Failed to load T3D: ${err.message}`, opts.onError);
            instance.destroy = () => root.unmount();
          });
        return instance;
      };
      if (opts.lazy) {
        instances.push(lazyMount(el, doFetchMount));
      } else {
        instances.push(doFetchMount());
      }
      continue;
    }
  }

  return instances;
}
