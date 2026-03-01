import { useState, useMemo, type FC } from 'react';
import type { UEMultiGraphJSON, SidebarParam } from '../types/ue-graph';
import { classifyPinType } from '../types/pin-types';
import type { DetailsItem } from './DetailsPanel';

interface SidebarProps {
  multiGraph: UEMultiGraphJSON;
  onNavigateToGraph: (graphName: string, focusTitle?: string) => void;
  onShowDetails?: (item: DetailsItem) => void;
  onOpenSpecialTab?: (name: string, type: 'datatable' | 'struct') => void;
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
    <div className="ueflow-sidebar-section">
      <button className="ueflow-section-header" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ueflow-section-title">{title}</span>
        <span className="ueflow-section-count">{count}</span>
        <span className={`ueflow-section-arrow ${open ? '' : 'ueflow-collapsed'}`}>&#9660;</span>
      </button>
      {open && <div className="ueflow-section-body">{children}</div>}
    </div>
  );
};

type SidebarEvent = UEMultiGraphJSON['events'][number];
type SidebarFunction = UEMultiGraphJSON['functions'][number];
type SidebarVariable = UEMultiGraphJSON['variables'][number];
type SidebarStruct = UEMultiGraphJSON['structs'][number];
type SidebarDelegate = UEMultiGraphJSON['delegates'][number];
type SidebarComponent = NonNullable<UEMultiGraphJSON['components']>[number];
type SidebarMacro = NonNullable<UEMultiGraphJSON['macros']>[number];

function replicationBadge(v: SidebarVariable): React.ReactNode {
  if (v.replicationMode) {
    const modeMap: Record<string, { label: string; cls: string }> = {
      Replicated: { label: 'R', cls: '' },
      RepNotify: { label: 'RN', cls: 'ueflow-badge-rep--repnotify' },
      ServerRPC: { label: 'S', cls: 'ueflow-badge-rep--server' },
      ClientRPC: { label: 'C', cls: 'ueflow-badge-rep--client' },
      MulticastRPC: { label: 'MC', cls: 'ueflow-badge-rep--multicast' },
    };
    const m = modeMap[v.replicationMode] ?? { label: 'R', cls: '' };
    return <span className={`ueflow-badge-rep ${m.cls}`}>{m.label}</span>;
  }
  if (v.replicated) return <span className="ueflow-badge-rep">R</span>;
  return null;
}

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
  if (n.startsWith('server_')) return 'ueflow-evt--server';
  if (n.startsWith('client_')) return 'ueflow-evt--client';
  if (n.startsWith('multicast_')) return 'ueflow-evt--multicast';
  if (n.startsWith('onrep_')) return 'ueflow-evt--replicated';
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

export const Sidebar: FC<SidebarProps> = ({ multiGraph, onNavigateToGraph, onShowDetails, onOpenSpecialTab }) => {
  const [search, setSearch] = useState('');
  const { events, functions, variables, structs, delegates, dataTables, graphs, components, macros } = multiGraph;
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
  const filteredComponents = useMemo(() =>
    (components ?? []).filter((c: SidebarComponent) => !q || c.name.toLowerCase().includes(q)),
    [components, q]);
  const filteredMacros = useMemo(() =>
    (macros ?? []).filter((m: SidebarMacro) => !q || m.name.toLowerCase().includes(q)),
    [macros, q]);

  const funcGroups = useMemo(() => groupByCategory(filteredFunctions), [filteredFunctions]);
  const varGroups = useMemo(() => groupByCategory(filteredVariables), [filteredVariables]);

  return (
    <nav className="ueflow-sidebar" aria-label="Blueprint explorer">
      <div className="ueflow-sidebar-search">
        <input
          className="ueflow-search-input"
          type="text"
          placeholder="Search sidebar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search sidebar"
        />
        {search && (
          <button className="ueflow-search-clear" onClick={() => setSearch('')} aria-label="Clear search">&times;</button>
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
                className={`ueflow-sidebar-item ueflow-sidebar-item--clickable ${evtClass}`}
                title={params || undefined}
                onClick={() => {
                  const graphName = findGraphForEvent(graphs, evt.name);
                  onNavigateToGraph(graphName, evt.name);
                  const rawParams = (evt.params || evt.inputs || []);
                  const parsed = rawParams.map(toParamObj).filter((p) => p.type !== 'Exec');
                  onShowDetails?.({ kind: 'event', name: evt.name, params: parsed, replicates: evt.replicates, reliable: evt.reliable, callInEditor: evt.callInEditor, accessSpecifier: evt.accessSpecifier, keywords: evt.keywords });
                }}
              >
                <span className={`ueflow-icon ueflow-icon--event ${evtClass ? 'ueflow-icon--' + evtClass.replace('ueflow-evt--', '') : ''}`}>E</span>
                <span className="ueflow-item-name">{evt.name}</span>
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
              <div className="ueflow-category-label">{category}</div>
              {fns.map((fn: SidebarFunction) => {
                const hasGraph = graphNames.includes(fn.name);
                const sig = formatSignature(fn);
                return (
                  <button
                    key={fn.name}
                    className={`ueflow-sidebar-item ${hasGraph ? 'ueflow-sidebar-item--clickable' : ''}`}
                    title={sig}
                    onClick={() => {
                      if (hasGraph) onNavigateToGraph(fn.name);
                      const inputs = (fn.inputs || fn.params || []).map(toParamObj).filter((p) => p.type !== 'Exec');
                      const outputs = (fn.outputs || fn.returns || []).map(toParamObj).filter((p) => p.type !== 'Exec');
                      onShowDetails?.({ kind: 'function', name: fn.name, category: fn.category, pure: fn.pure, description: fn.description, keywords: fn.keywords, compactTitle: fn.compactTitle, callInEditor: fn.callInEditor, accessSpecifier: fn.accessSpecifier, inputs, outputs });
                    }}
                  >
                    <span className="ueflow-icon ueflow-icon--function">f</span>
                    <span className="ueflow-item-name">{fn.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </Section>
      )}

      {/* Macros */}
      {filteredMacros.length > 0 && (
        <Section title="MACROS" count={filteredMacros.length}>
          {filteredMacros.map((m: SidebarMacro) => {
            const hasGraph = graphNames.includes(m.name);
            return (
              <button
                key={m.name}
                className={`ueflow-sidebar-item ${hasGraph ? 'ueflow-sidebar-item--clickable' : 'ueflow-sidebar-item--clickable'}`}
                onClick={() => {
                  if (hasGraph) onNavigateToGraph(m.name);
                  const inputs = (m.inputs ?? []).map(toParamObj).filter((p) => p.type !== 'Exec');
                  const outputs = (m.outputs ?? []).map(toParamObj).filter((p) => p.type !== 'Exec');
                  onShowDetails?.({ kind: 'macro', name: m.name, category: m.category, inputs, outputs });
                }}
              >
                <span className="ueflow-icon ueflow-icon--macro">M</span>
                <span className="ueflow-item-name">{m.name}</span>
              </button>
            );
          })}
        </Section>
      )}

      {/* Variables */}
      {filteredVariables.length > 0 && (
        <Section title="VARIABLES" count={filteredVariables.length} defaultOpen={filteredVariables.length <= 30}>
          {Array.from(varGroups.entries()).map(([category, vars]) => (
            <div key={category}>
              {varGroups.size > 1 && <div className="ueflow-category-label">{category}</div>}
              {vars.map((v: SidebarVariable) => {
                const typeStr = shortType(v.type || '');
                return (
                  <button key={v.name} className="ueflow-sidebar-item ueflow-sidebar-item--clickable" title={v.type} onClick={() => onShowDetails?.({ kind: 'variable', name: v.name, type: v.type, category: v.category, default: v.default, replication: v.replicationMode ?? (v.replicated ? 'Replicated' : undefined), containerType: v.containerType, innerType: v.innerType, keyType: v.keyType, instanceEditable: v.instanceEditable, exposeOnSpawn: v.exposeOnSpawn, private: v.private, transient: v.transient, saveGame: v.saveGame })}>
                    <span className={`ueflow-icon ueflow-icon--type-${typeClass(v.type)}`} />
                    <span className="ueflow-item-name">{v.name}</span>
                    {v.instanceEditable && <span className="ueflow-badge-eye" title="Instance Editable">&#128065;</span>}
                    <span className="ueflow-item-type">{typeStr}</span>
                    {replicationBadge(v)}
                  </button>
                );
              })}
            </div>
          ))}
        </Section>
      )}

      {/* Components (tree view) */}
      {filteredComponents.length > 0 && (
        <Section title="COMPONENTS" count={filteredComponents.length}>
          {(() => {
            // Build tree from flat list using parent references
            const allComponents = components ?? [];
            const childrenMap = new Map<string, SidebarComponent[]>();
            const roots: SidebarComponent[] = [];
            for (const c of allComponents) {
              if (c.parent) {
                if (!childrenMap.has(c.parent)) childrenMap.set(c.parent, []);
                childrenMap.get(c.parent)!.push(c);
              } else {
                roots.push(c);
              }
            }
            const filteredSet = new Set(filteredComponents.map((c: SidebarComponent) => c.name));
            const renderTree = (items: SidebarComponent[], depth: number): React.ReactNode[] => {
              const result: React.ReactNode[] = [];
              for (const c of items) {
                if (filteredSet.has(c.name)) {
                  result.push(
                    <button
                      key={c.name}
                      className="ueflow-sidebar-item ueflow-sidebar-item--clickable"
                      style={{ paddingLeft: `${16 + depth * 14}px` }}
                      title={c.class}
                      onClick={() => onShowDetails?.({ kind: 'component', name: c.name, componentClass: c.class, parent: c.parent, properties: c.properties })}
                    >
                      {depth > 0 && <span style={{ color: '#555', fontSize: 8, marginRight: 2 }}>{'└'}</span>}
                      <span className="ueflow-icon ueflow-icon--component">C</span>
                      <span className="ueflow-item-name">{c.name}</span>
                      <span className="ueflow-item-type">{shortType(c.class)}</span>
                    </button>
                  );
                }
                const kids = childrenMap.get(c.name);
                if (kids) result.push(...renderTree(kids, depth + 1));
              }
              return result;
            };
            return renderTree(roots, 0);
          })()}
        </Section>
      )}

      {/* Structs */}
      {filteredStructs.length > 0 && (
        <Section title="STRUCTS" count={filteredStructs.length} defaultOpen={true}>
          {filteredStructs.map((s: SidebarStruct) => {
            const fieldCount = s.fields?.length ?? 0;
            return (
              <button key={s.name} className="ueflow-sidebar-item ueflow-sidebar-item--clickable" title={`${fieldCount} fields`} onClick={() => {
                onOpenSpecialTab?.(s.name, 'struct');
                onShowDetails?.({ kind: 'struct', name: s.name, fields: s.fields || [] });
              }}>
                <span className="ueflow-icon ueflow-icon--struct">S</span>
                <span className="ueflow-item-name">{s.name}</span>
                <span className="ueflow-item-type">{fieldCount}f</span>
              </button>
            );
          })}
        </Section>
      )}

      {/* Delegates */}
      {filteredDelegates.length > 0 && (
        <Section title="EVENT DISPATCHERS" count={filteredDelegates.length} defaultOpen={true}>
          {filteredDelegates.map((d: SidebarDelegate) => (
            <button key={d.name} className="ueflow-sidebar-item ueflow-sidebar-item--clickable" title={d.signature || ''} onClick={() => {
              const params = d.params ? d.params.map(toParamObj) : undefined;
              onShowDetails?.({ kind: 'delegate', name: d.name, signature: d.signature, params });
            }}>
              <span className="ueflow-icon ueflow-icon--delegate">D</span>
              <span className="ueflow-item-name">{d.name}</span>
              {d.params && d.params.length > 0 && (
                <span className="ueflow-item-type">{d.params.map(toParamObj).map(p => p.type || p.name).join(', ')}</span>
              )}
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
              <button key={name} className="ueflow-sidebar-item ueflow-sidebar-item--clickable" title={`${rowCount} rows`} onClick={() => {
                onOpenSpecialTab?.(name, 'datatable');
                onShowDetails?.({ kind: 'datatable', name, rowCount, columns });
              }}>
                <span className="ueflow-icon ueflow-icon--table">T</span>
                <span className="ueflow-item-name">{name}</span>
                {rowCount > 0 && <span className="ueflow-item-type">{rowCount}r</span>}
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
