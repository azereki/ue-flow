import { useState, useMemo, type FC } from 'react';
import type { UEMultiGraphJSON, SidebarParam } from '../types/ue-graph';
import { classifyPinType } from '../types/pin-types';
import type { DetailsItem } from './DetailsPanel';

interface SidebarProps {
  multiGraph: UEMultiGraphJSON;
  onNavigateToGraph: (graphName: string, focusTitle?: string) => void;
  onShowDetails?: (item: DetailsItem) => void;
}

interface SectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: FC<SectionProps> = ({ title, count, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="uf-sidebar-section">
      <button className="uf-section-header" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="uf-section-title">{title}</span>
        <span className="uf-section-count">{count}</span>
        <span className={`uf-section-arrow ${open ? '' : 'uf-collapsed'}`}>&#9660;</span>
      </button>
      {open && <div className="uf-section-body">{children}</div>}
    </div>
  );
};

type SidebarEvent = UEMultiGraphJSON['events'][number];
type SidebarFunction = UEMultiGraphJSON['functions'][number];
type SidebarVariable = UEMultiGraphJSON['variables'][number];
type SidebarStruct = UEMultiGraphJSON['structs'][number];
type SidebarDelegate = UEMultiGraphJSON['delegates'][number];

/** Parse a param that may be a "name: Type" string or an {name, type} object. */
function toParamObj(p: SidebarParam): { name: string; type: string } {
  if (typeof p === 'string') {
    const idx = p.indexOf(':');
    if (idx >= 0) return { name: p.slice(0, idx).trim(), type: p.slice(idx + 1).trim() };
    return { name: p, type: '' };
  }
  return { name: p.name ?? '', type: p.type ?? '' };
}

function formatSignature(fn: SidebarFunction): string {
  const inputs = (fn.inputs || fn.params || [])
    .map(toParamObj)
    .filter((p) => p.type !== 'Exec' && p.name !== 'then' && p.name !== 'execute')
    .map((p) => `${p.name}: ${shortType(p.type)}`)
    .join(', ');
  const outputs = (fn.outputs || fn.returns || [])
    .map(toParamObj)
    .filter((p) => p.type !== 'Exec' && p.name !== 'then' && p.name !== 'execute')
    .map((p) => `${p.name}: ${shortType(p.type)}`)
    .join(', ');
  if (outputs) return `${inputs} -> ${outputs}`;
  if (inputs) return inputs;
  return '-> void';
}

function shortType(t: string): string {
  if (!t) return '?';
  return t
    .replace(' Object Reference', '')
    .replace(' Structure', '')
    .replace('Gameplay Tag Container', 'TagContainer')
    .replace('Gameplay Tag', 'Tag')
    .replace('Float (double-precision)', 'Float')
    .replace(' Component', 'Comp');
}

function eventColorClass(name: string): string {
  const n = name.toLowerCase();
  if (n.startsWith('server_')) return 'uf-evt--server';
  if (n.startsWith('client_')) return 'uf-evt--client';
  if (n.startsWith('multicast_')) return 'uf-evt--multicast';
  if (n.startsWith('onrep_')) return 'uf-evt--replicated';
  return '';
}

function groupByCategory<T extends { category?: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const cat = item.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }
  return groups;
}

/** Find which graph contains a node matching the given event name. */
function findGraphForEvent(graphs: Record<string, { nodes: Array<{ title: string }> }>, eventName: string): string {
  const q = eventName.toLowerCase();
  for (const [graphName, graph] of Object.entries(graphs)) {
    if (graph.nodes.some(n => {
      const t = n.title.toLowerCase();
      return t === q || t.includes(q);
    })) {
      return graphName;
    }
  }
  return 'EventGraph';
}

export const Sidebar: FC<SidebarProps> = ({ multiGraph, onNavigateToGraph, onShowDetails }) => {
  const [search, setSearch] = useState('');
  const { events, functions, variables, structs, delegates, dataTables, graphs } = multiGraph;
  const graphNames = Object.keys(graphs);
  const dtKeys = Object.keys(dataTables || {});

  const q = search.toLowerCase();

  const eventNodes = useMemo(() =>
    (events?.length > 0 ? events : []).filter((e: SidebarEvent) => !q || e.name.toLowerCase().includes(q)),
    [events, q]);
  const filteredFunctions = useMemo(() =>
    functions.filter((f: SidebarFunction) => !q || f.name.toLowerCase().includes(q)),
    [functions, q]);
  const filteredVariables = useMemo(() =>
    variables.filter((v: SidebarVariable) => !q || v.name.toLowerCase().includes(q)),
    [variables, q]);
  const filteredStructs = useMemo(() =>
    structs.filter((s: SidebarStruct) => !q || s.name.toLowerCase().includes(q)),
    [structs, q]);
  const filteredDelegates = useMemo(() =>
    delegates.filter((d: SidebarDelegate) => !q || d.name.toLowerCase().includes(q)),
    [delegates, q]);
  const filteredDtKeys = useMemo(() =>
    dtKeys.filter((k) => !q || k.toLowerCase().includes(q)),
    [dtKeys, q]);

  const funcGroups = useMemo(() => groupByCategory(filteredFunctions), [filteredFunctions]);
  const varGroups = useMemo(() => groupByCategory(filteredVariables), [filteredVariables]);

  return (
    <nav className="uf-sidebar" aria-label="Blueprint explorer">
      <div className="uf-sidebar-search">
        <input
          className="uf-search-input"
          type="text"
          placeholder="Search sidebar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search sidebar"
        />
        {search && (
          <button className="uf-search-clear" onClick={() => setSearch('')} aria-label="Clear search">&times;</button>
        )}
      </div>
      {/* Events */}
      {eventNodes.length > 0 && (
        <Section title="EVENTS" count={eventNodes.length}>
          {eventNodes.map((evt: SidebarEvent) => {
            const params = (evt.params || evt.inputs || [])
              .map(toParamObj)
              .filter((p) => p.type !== 'Exec' && p.name !== 'then')
              .map((p) => `${p.name}: ${shortType(p.type || '')}`)
              .join(', ');
            const evtClass = eventColorClass(evt.name);
            return (
              <button
                key={evt.name}
                className={`uf-sidebar-item uf-sidebar-item--clickable ${evtClass}`}
                title={params || undefined}
                onClick={() => {
                  const graphName = findGraphForEvent(graphs, evt.name);
                  onNavigateToGraph(graphName, evt.name);
                  const rawParams = (evt.params || evt.inputs || []);
                  const parsed = rawParams.map(toParamObj).filter((p) => p.type !== 'Exec');
                  onShowDetails?.({ kind: 'event', name: evt.name, params: parsed });
                }}
              >
                <span className={`uf-icon uf-icon--event ${evtClass ? 'uf-icon--' + evtClass.replace('uf-evt--', '') : ''}`}>E</span>
                <span className="uf-item-name">{evt.name}</span>
              </button>
            );
          })}
        </Section>
      )}

      {/* Functions */}
      {filteredFunctions.length > 0 && (
        <Section title="FUNCTIONS" count={filteredFunctions.length}>
          {Array.from(funcGroups.entries()).map(([category, fns]) => (
            <div key={category}>
              <div className="uf-category-label">{category}</div>
              {fns.map((fn: SidebarFunction) => {
                const hasGraph = graphNames.includes(fn.name);
                const sig = formatSignature(fn);
                return (
                  <button
                    key={fn.name}
                    className={`uf-sidebar-item ${hasGraph ? 'uf-sidebar-item--clickable' : ''}`}
                    title={sig}
                    onClick={() => {
                      if (hasGraph) onNavigateToGraph(fn.name);
                      const inputs = (fn.inputs || fn.params || []).map(toParamObj).filter((p) => p.type !== 'Exec');
                      const outputs = (fn.outputs || fn.returns || []).map(toParamObj).filter((p) => p.type !== 'Exec');
                      onShowDetails?.({ kind: 'function', name: fn.name, category: fn.category, inputs, outputs });
                    }}
                  >
                    <span className="uf-icon uf-icon--function">f</span>
                    <span className="uf-item-name">{fn.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </Section>
      )}

      {/* Variables */}
      {filteredVariables.length > 0 && (
        <Section title="VARIABLES" count={filteredVariables.length} defaultOpen={filteredVariables.length <= 30}>
          {Array.from(varGroups.entries()).map(([category, vars]) => (
            <div key={category}>
              {varGroups.size > 1 && <div className="uf-category-label">{category}</div>}
              {vars.map((v: SidebarVariable) => {
                const typeStr = shortType(v.type || '');
                return (
                  <button key={v.name} className="uf-sidebar-item uf-sidebar-item--clickable" title={v.type} onClick={() => onShowDetails?.({ kind: 'variable', name: v.name, type: v.type, category: v.category, default: v.default, replication: v.replicated ? 'Replicated' : undefined })}>
                    <span className={`uf-icon uf-icon--type-${typeClass(v.type)}`} />
                    <span className="uf-item-name">{v.name}</span>
                    <span className="uf-item-type">{typeStr}</span>
                    {v.replicated && <span className="uf-badge-rep">R</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </Section>
      )}

      {/* Structs */}
      {filteredStructs.length > 0 && (
        <Section title="STRUCTS" count={filteredStructs.length} defaultOpen={true}>
          {filteredStructs.map((s: SidebarStruct) => {
            const fieldCount = s.fields?.length ?? 0;
            return (
              <button key={s.name} className="uf-sidebar-item uf-sidebar-item--clickable" title={`${fieldCount} fields`} onClick={() => onShowDetails?.({ kind: 'struct', name: s.name, fields: s.fields || [] })}>
                <span className="uf-icon uf-icon--struct">S</span>
                <span className="uf-item-name">{s.name}</span>
                <span className="uf-item-type">{fieldCount}f</span>
              </button>
            );
          })}
        </Section>
      )}

      {/* Delegates */}
      {filteredDelegates.length > 0 && (
        <Section title="DELEGATES" count={filteredDelegates.length} defaultOpen={true}>
          {filteredDelegates.map((d: SidebarDelegate) => (
            <button key={d.name} className="uf-sidebar-item uf-sidebar-item--clickable" title={d.signature || ''} onClick={() => onShowDetails?.({ kind: 'delegate', name: d.name, signature: d.signature })}>
              <span className="uf-icon uf-icon--delegate">D</span>
              <span className="uf-item-name">{d.name}</span>
            </button>
          ))}
        </Section>
      )}

      {/* Data Tables */}
      {filteredDtKeys.length > 0 && (
        <Section title="DATA TABLES" count={filteredDtKeys.length} defaultOpen={true}>
          {filteredDtKeys.map((name) => {
            const dt = dataTables[name];
            const rowCount = dt?.sampleRows?.length ?? 0;
            const columns = dt?.columns as string[] | undefined;
            return (
              <button key={name} className="uf-sidebar-item uf-sidebar-item--clickable" title={`${rowCount} rows`} onClick={() => onShowDetails?.({ kind: 'datatable', name, rowCount, columns })}>
                <span className="uf-icon uf-icon--table">T</span>
                <span className="uf-item-name">{name}</span>
                {rowCount > 0 && <span className="uf-item-type">{rowCount}r</span>}
              </button>
            );
          })}
        </Section>
      )}
    </nav>
  );
};

function typeClass(type: string): string {
  // Container types aren't pin categories — handle before classifyPinType
  const t = type.toLowerCase();
  if (t.includes('array') || t.includes('map') || t.includes('set')) return 'array';
  const cat = classifyPinType(type);
  if (cat === 'name' || cat === 'text') return 'string';
  if (cat === 'wildcard' || cat === 'class' || cat === 'softclass' || cat === 'softobject' || cat === 'interface' || cat === 'object' || cat === 'byte') return 'object';
  return cat;
}
