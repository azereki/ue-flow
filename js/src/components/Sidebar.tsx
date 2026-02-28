import { useState, type FC } from 'react';
import type { UEMultiGraphJSON } from '../types/ue-graph';
import type { DetailsItem } from './DetailsPanel';

interface SidebarProps {
  multiGraph: UEMultiGraphJSON;
  onNavigateToGraph: (graphName: string) => void;
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
      <div className="uf-section-header" onClick={() => setOpen(!open)}>
        <span className="uf-section-title">{title}</span>
        <span className="uf-section-count">{count}</span>
        <span className={`uf-section-arrow ${open ? '' : 'uf-collapsed'}`}>&#9660;</span>
      </div>
      {open && <div className="uf-section-body">{children}</div>}
    </div>
  );
};

function formatSignature(fn: any): string {
  const inputs = (fn.inputs || fn.params || [])
    .filter((p: any) => p.type !== 'Exec' && p.name !== 'then' && p.name !== 'execute')
    .map((p: any) => `${p.name}: ${shortType(p.type)}`)
    .join(', ');
  const outputs = (fn.outputs || fn.returns || [])
    .filter((p: any) => p.type !== 'Exec' && p.name !== 'then' && p.name !== 'execute')
    .map((p: any) => `${p.name}: ${shortType(p.type)}`)
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

function groupByCategory(items: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  for (const item of items) {
    const cat = item.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }
  return groups;
}

export const Sidebar: FC<SidebarProps> = ({ multiGraph, onNavigateToGraph, onShowDetails }) => {
  const [search, setSearch] = useState('');
  const { events, functions, variables, structs, delegates, dataTables } = multiGraph;
  const graphNames = Object.keys(multiGraph.graphs);
  const dtKeys = Object.keys(dataTables || {});

  const q = search.toLowerCase();
  const matchName = (name: string) => !q || name.toLowerCase().includes(q);

  const eventNodes = (events?.length > 0 ? events : []).filter((e: any) => matchName(e.name));
  const filteredFunctions = functions.filter((f: any) => matchName(f.name));
  const filteredVariables = variables.filter((v: any) => matchName(v.name));
  const filteredStructs = structs.filter((s: any) => matchName(s.name));
  const filteredDelegates = delegates.filter((d: any) => matchName(d.name));
  const filteredDtKeys = dtKeys.filter((k) => matchName(k));

  const funcGroups = groupByCategory(filteredFunctions);
  const varGroups = groupByCategory(filteredVariables);

  return (
    <div className="uf-sidebar">
      <div className="uf-sidebar-search">
        <input
          className="uf-search-input"
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="uf-search-clear" onClick={() => setSearch('')}>&times;</button>
        )}
      </div>
      {/* Events */}
      {eventNodes.length > 0 && (
        <Section title="EVENTS" count={eventNodes.length}>
          {eventNodes.map((evt: any) => {
            const params = (evt.params || evt.inputs || [])
              .filter((p: any) => p.type !== 'Exec' && p.name !== 'then')
              .map((p: any) => `${p.name}: ${shortType(p.type || '')}`)
              .join(', ');
            return (
              <div
                key={evt.name}
                className="uf-sidebar-item uf-sidebar-item--clickable"
                title={params || undefined}
                onClick={() => {
                  onNavigateToGraph('EventGraph');
                  onShowDetails?.({ kind: 'event', name: evt.name, params: (evt.params || evt.inputs || []).filter((p: any) => p.type !== 'Exec') });
                }}
              >
                <span className="uf-icon uf-icon--event">E</span>
                <span className="uf-item-name">{evt.name}</span>
              </div>
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
              {fns.map((fn: any) => {
                const hasGraph = graphNames.includes(fn.name);
                const sig = formatSignature(fn);
                return (
                  <div
                    key={fn.name}
                    className={`uf-sidebar-item ${hasGraph ? 'uf-sidebar-item--clickable' : ''}`}
                    title={sig}
                    onClick={() => {
                      if (hasGraph) onNavigateToGraph(fn.name);
                      onShowDetails?.({ kind: 'function', name: fn.name, category: fn.category, inputs: fn.inputs || fn.params, outputs: fn.outputs || fn.returns });
                    }}
                  >
                    <span className="uf-icon uf-icon--function">f</span>
                    <span className="uf-item-name">{fn.name}</span>
                  </div>
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
              {vars.map((v: any) => {
                const typeStr = shortType(v.type || '');
                return (
                  <div key={v.name} className="uf-sidebar-item uf-sidebar-item--clickable" title={v.type} onClick={() => onShowDetails?.({ kind: 'variable', name: v.name, type: v.type, category: v.category, default: v.default, replication: v.replicated ? 'Replicated' : undefined })}>
                    <span className={`uf-icon uf-icon--type-${typeClass(v.type)}`} />
                    <span className="uf-item-name">{v.name}</span>
                    <span className="uf-item-type">{typeStr}</span>
                    {v.replicated && <span className="uf-badge-rep">R</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </Section>
      )}

      {/* Structs */}
      {filteredStructs.length > 0 && (
        <Section title="STRUCTS" count={filteredStructs.length} defaultOpen={true}>
          {filteredStructs.map((s: any) => {
            const fieldCount = s.fields?.length ?? 0;
            return (
              <div key={s.name} className="uf-sidebar-item uf-sidebar-item--clickable" title={`${fieldCount} fields`} onClick={() => onShowDetails?.({ kind: 'struct', name: s.name, fields: s.fields || [] })}>
                <span className="uf-icon uf-icon--struct">S</span>
                <span className="uf-item-name">{s.name}</span>
                <span className="uf-item-type">{fieldCount}f</span>
              </div>
            );
          })}
        </Section>
      )}

      {/* Delegates */}
      {filteredDelegates.length > 0 && (
        <Section title="DELEGATES" count={filteredDelegates.length} defaultOpen={true}>
          {filteredDelegates.map((d: any) => (
            <div key={d.name} className="uf-sidebar-item" title={d.signature || ''}>
              <span className="uf-icon uf-icon--delegate">D</span>
              <span className="uf-item-name">{d.name}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Data Tables */}
      {filteredDtKeys.length > 0 && (
        <Section title="DATA TABLES" count={filteredDtKeys.length} defaultOpen={true}>
          {filteredDtKeys.map((name) => {
            const dt = (dataTables as any)[name];
            const rowCount = dt?.sampleRows?.length ?? 0;
            return (
              <div key={name} className="uf-sidebar-item" title={`${rowCount} rows`}>
                <span className="uf-icon uf-icon--table">T</span>
                <span className="uf-item-name">{name}</span>
                {rowCount > 0 && <span className="uf-item-type">{rowCount}r</span>}
              </div>
            );
          })}
        </Section>
      )}
    </div>
  );
};

function typeClass(type: string): string {
  if (!type) return 'object';
  const t = type.toLowerCase();
  if (t.includes('bool')) return 'bool';
  if (t.includes('float') || t.includes('real') || t.includes('double')) return 'float';
  if (t.includes('int')) return 'int';
  if (t.includes('string') || t.includes('text') || t.includes('name')) return 'string';
  if (t.includes('struct') || t.includes('tag') || t.includes('vector') || t.includes('rotator')) return 'struct';
  if (t.includes('delegate')) return 'delegate';
  if (t.includes('enum')) return 'enum';
  if (t.includes('array') || t.includes('map') || t.includes('set')) return 'array';
  return 'object';
}
