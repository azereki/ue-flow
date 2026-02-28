import { useState, type FC } from 'react';
import type { UEMultiGraphJSON } from '../types/ue-graph';

interface SidebarProps {
  multiGraph: UEMultiGraphJSON;
  onNavigateToGraph: (graphName: string) => void;
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
      <div className="ueflow-sidebar-section-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="ueflow-sidebar-section-count">{count}</span>
        <span className={`ueflow-sidebar-arrow ${open ? '' : 'collapsed'}`}>&#9660;</span>
      </div>
      {open && <div className="ueflow-sidebar-section-body">{children}</div>}
    </div>
  );
};

export const Sidebar: FC<SidebarProps> = ({ multiGraph, onNavigateToGraph }) => {
  const { events, functions, variables, structs, delegates, dataTables } = multiGraph;
  const graphNames = Object.keys(multiGraph.graphs);

  return (
    <div className="ueflow-sidebar">
      {/* Events */}
      {events.length > 0 && (
        <Section title="EVENTS" count={events.length}>
          {events.map((evt) => (
            <div
              key={evt.name}
              className="ueflow-sidebar-item"
              onClick={() => onNavigateToGraph('EventGraph')}
            >
              <span className="ueflow-sidebar-icon type-event" />
              <span className="ueflow-sidebar-name">{evt.name}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Functions */}
      {functions.length > 0 && (
        <Section title="FUNCTIONS" count={functions.length}>
          {functions.map((fn) => {
            const hasGraph = graphNames.includes(fn.name);
            return (
              <div
                key={fn.name}
                className={`ueflow-sidebar-item ${hasGraph ? 'ueflow-sidebar-item--clickable' : ''}`}
                onClick={() => hasGraph && onNavigateToGraph(fn.name)}
              >
                <span className="ueflow-sidebar-icon type-function" />
                <span className="ueflow-sidebar-name">{fn.name}</span>
                {fn.category && (
                  <span className="ueflow-sidebar-badge">{fn.category}</span>
                )}
              </div>
            );
          })}
        </Section>
      )}

      {/* Variables */}
      {variables.length > 0 && (
        <Section title="VARIABLES" count={variables.length} defaultOpen={variables.length <= 20}>
          {variables.map((v) => (
            <div key={v.name} className="ueflow-sidebar-item">
              <span className={`ueflow-sidebar-icon type-${(v.type || 'object').toLowerCase()}`} />
              <span className="ueflow-sidebar-name">{v.name}</span>
              <span className="ueflow-sidebar-type">{v.type}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Structs */}
      {structs.length > 0 && (
        <Section title="STRUCTS" count={structs.length} defaultOpen={false}>
          {structs.map((s) => (
            <div key={s.name} className="ueflow-sidebar-item">
              <span className="ueflow-sidebar-icon type-struct" />
              <span className="ueflow-sidebar-name">{s.name}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Delegates */}
      {delegates.length > 0 && (
        <Section title="DELEGATES" count={delegates.length} defaultOpen={false}>
          {delegates.map((d) => (
            <div key={d.name} className="ueflow-sidebar-item">
              <span className="ueflow-sidebar-icon type-delegate" />
              <span className="ueflow-sidebar-name">{d.name}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Data Tables */}
      {Object.keys(dataTables).length > 0 && (
        <Section title="DATA TABLES" count={Object.keys(dataTables).length} defaultOpen={false}>
          {Object.keys(dataTables).map((name) => (
            <div key={name} className="ueflow-sidebar-item">
              <span className="ueflow-sidebar-icon type-struct" />
              <span className="ueflow-sidebar-name">{name}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
};
