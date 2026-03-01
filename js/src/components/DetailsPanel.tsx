import { useState, type FC } from 'react';
import { PIN_COLORS, classifyPinType } from '../types/pin-types';

export type DetailsItem =
  | { kind: 'event'; name: string; params?: Array<{ name: string; type: string }> }
  | { kind: 'function'; name: string; category?: string; pure?: boolean; inputs?: Array<{ name: string; type: string }>; outputs?: Array<{ name: string; type: string }> }
  | { kind: 'variable'; name: string; type: string; category?: string; replication?: string; default?: string }
  | { kind: 'struct'; name: string; fields: Array<{ name: string; type: string; default?: string }> }
  | { kind: 'delegate'; name: string; signature?: string }
  | { kind: 'datatable'; name: string; rowCount: number; columns?: string[] };

interface DetailsPanelProps {
  item: DetailsItem;
  onClose: () => void;
}

function typeColor(type: string | undefined): string {
  return PIN_COLORS[classifyPinType(type)];
}

const TypeDot: FC<{ type: string }> = ({ type }) => (
  <span className="uf-details-type-dot" style={{ background: typeColor(type) }} />
);

const CollapsibleSection: FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="uf-details-section">
      <button className="uf-details-section-header" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={`uf-details-section-arrow ${open ? '' : 'uf-collapsed'}`}>&#9660;</span>
        <span>{title}</span>
      </button>
      {open && <div className="uf-details-section-body">{children}</div>}
    </div>
  );
};

const ParamRow: FC<{ name: string; type: string; value?: string }> = ({ name, type, value }) => (
  <div className="uf-details-param-row">
    <TypeDot type={type} />
    <span className="uf-details-param-name">{name}</span>
    <span className="uf-details-param-type">{type}</span>
    {value && <span className="uf-details-param-value">{value}</span>}
  </div>
);

function EventDetails({ item }: { item: Extract<DetailsItem, { kind: 'event' }> }) {
  return (
    <>
      <CollapsibleSection title="Parameters">
        {item.params && item.params.length > 0 ? (
          item.params.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} />)
        ) : (
          <div className="uf-details-empty">No parameters</div>
        )}
      </CollapsibleSection>
    </>
  );
}

function FunctionDetails({ item }: { item: Extract<DetailsItem, { kind: 'function' }> }) {
  return (
    <>
      {item.category && (
        <div className="uf-details-row">
          <span className="uf-details-label">Category</span>
          <span className="uf-details-value">{item.category}</span>
        </div>
      )}
      <CollapsibleSection title="Inputs">
        {item.inputs && item.inputs.length > 0 ? (
          item.inputs.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} />)
        ) : (
          <div className="uf-details-empty">No inputs</div>
        )}
      </CollapsibleSection>
      <CollapsibleSection title="Outputs">
        {item.outputs && item.outputs.length > 0 ? (
          item.outputs.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} />)
        ) : (
          <div className="uf-details-empty">No outputs</div>
        )}
      </CollapsibleSection>
    </>
  );
}

function VariableDetails({ item }: { item: Extract<DetailsItem, { kind: 'variable' }> }) {
  return (
    <>
      <div className="uf-details-row">
        <span className="uf-details-label">Type</span>
        <span className="uf-details-value"><TypeDot type={item.type} /> {item.type}</span>
      </div>
      {item.category && (
        <div className="uf-details-row">
          <span className="uf-details-label">Category</span>
          <span className="uf-details-value">{item.category}</span>
        </div>
      )}
      {item.replication && (
        <div className="uf-details-row">
          <span className="uf-details-label">Replication</span>
          <span className="uf-details-value">{item.replication}</span>
        </div>
      )}
      {item.default && (
        <div className="uf-details-row">
          <span className="uf-details-label">Default</span>
          <span className="uf-details-value uf-details-mono">{item.default}</span>
        </div>
      )}
    </>
  );
}

function StructDetails({ item }: { item: Extract<DetailsItem, { kind: 'struct' }> }) {
  return (
    <CollapsibleSection title={`Fields (${item.fields.length})`}>
      {item.fields.map((f, i) => (
        <ParamRow key={i} name={f.name} type={f.type} value={f.default} />
      ))}
    </CollapsibleSection>
  );
}

function DelegateDetails({ item }: { item: Extract<DetailsItem, { kind: 'delegate' }> }) {
  return (
    <>
      {item.signature && (
        <div className="uf-details-row">
          <span className="uf-details-label">Signature</span>
          <span className="uf-details-value uf-details-mono">{item.signature}</span>
        </div>
      )}
    </>
  );
}

function DataTableDetails({ item }: { item: Extract<DetailsItem, { kind: 'datatable' }> }) {
  return (
    <>
      <div className="uf-details-row">
        <span className="uf-details-label">Rows</span>
        <span className="uf-details-value">{item.rowCount}</span>
      </div>
      {item.columns && item.columns.length > 0 && (
        <CollapsibleSection title={`Columns (${item.columns.length})`}>
          {item.columns.map((col, i) => (
            <div key={i} className="uf-details-param-row">
              <span className="uf-details-param-name">{col}</span>
            </div>
          ))}
        </CollapsibleSection>
      )}
    </>
  );
}

export const DetailsPanel: FC<DetailsPanelProps> = ({ item, onClose }) => {
  return (
    <div className="uf-details-panel">
      <div className="uf-details-header">
        <span className="uf-details-title">{item.name}</span>
        <button className="uf-details-close" onClick={onClose} aria-label="Close details">&times;</button>
      </div>
      <div className="uf-details-badge">{item.kind}</div>
      <div className="uf-details-content">
        {item.kind === 'event' && <EventDetails item={item} />}
        {item.kind === 'function' && <FunctionDetails item={item} />}
        {item.kind === 'variable' && <VariableDetails item={item} />}
        {item.kind === 'struct' && <StructDetails item={item} />}
        {item.kind === 'delegate' && <DelegateDetails item={item} />}
        {item.kind === 'datatable' && <DataTableDetails item={item} />}
      </div>
    </div>
  );
};
