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
  <span className="ueflow-details-type-dot" style={{ background: typeColor(type) }} />
);

const CollapsibleSection: FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ueflow-details-section">
      <button className="ueflow-details-section-header" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={`ueflow-details-section-arrow ${open ? '' : 'ueflow-collapsed'}`}>&#9660;</span>
        <span>{title}</span>
      </button>
      {open && <div className="ueflow-details-section-body">{children}</div>}
    </div>
  );
};

const ParamRow: FC<{ name: string; type: string; value?: string }> = ({ name, type, value }) => (
  <div className="ueflow-details-param-row">
    <TypeDot type={type} />
    <span className="ueflow-details-param-name">{name}</span>
    <span className="ueflow-details-param-type">{type}</span>
    {value && <span className="ueflow-details-param-value">{value}</span>}
  </div>
);

function EventDetails({ item }: { item: Extract<DetailsItem, { kind: 'event' }> }) {
  return (
    <>
      <CollapsibleSection title="Parameters">
        {item.params && item.params.length > 0 ? (
          item.params.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} />)
        ) : (
          <div className="ueflow-details-empty">No parameters</div>
        )}
      </CollapsibleSection>
    </>
  );
}

function FunctionDetails({ item }: { item: Extract<DetailsItem, { kind: 'function' }> }) {
  return (
    <>
      {item.category && (
        <div className="ueflow-details-row">
          <span className="ueflow-details-label">Category</span>
          <span className="ueflow-details-value">{item.category}</span>
        </div>
      )}
      <CollapsibleSection title="Inputs">
        {item.inputs && item.inputs.length > 0 ? (
          item.inputs.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} />)
        ) : (
          <div className="ueflow-details-empty">No inputs</div>
        )}
      </CollapsibleSection>
      <CollapsibleSection title="Outputs">
        {item.outputs && item.outputs.length > 0 ? (
          item.outputs.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} />)
        ) : (
          <div className="ueflow-details-empty">No outputs</div>
        )}
      </CollapsibleSection>
    </>
  );
}

function VariableDetails({ item }: { item: Extract<DetailsItem, { kind: 'variable' }> }) {
  return (
    <>
      <div className="ueflow-details-row">
        <span className="ueflow-details-label">Type</span>
        <span className="ueflow-details-value"><TypeDot type={item.type} /> {item.type}</span>
      </div>
      {item.category && (
        <div className="ueflow-details-row">
          <span className="ueflow-details-label">Category</span>
          <span className="ueflow-details-value">{item.category}</span>
        </div>
      )}
      {item.replication && (
        <div className="ueflow-details-row">
          <span className="ueflow-details-label">Replication</span>
          <span className="ueflow-details-value">{item.replication}</span>
        </div>
      )}
      {item.default && (
        <div className="ueflow-details-row">
          <span className="ueflow-details-label">Default</span>
          <span className="ueflow-details-value ueflow-details-mono">{item.default}</span>
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
        <div className="ueflow-details-row">
          <span className="ueflow-details-label">Signature</span>
          <span className="ueflow-details-value ueflow-details-mono">{item.signature}</span>
        </div>
      )}
    </>
  );
}

function DataTableDetails({ item }: { item: Extract<DetailsItem, { kind: 'datatable' }> }) {
  return (
    <>
      <div className="ueflow-details-row">
        <span className="ueflow-details-label">Rows</span>
        <span className="ueflow-details-value">{item.rowCount}</span>
      </div>
      {item.columns && item.columns.length > 0 && (
        <CollapsibleSection title={`Columns (${item.columns.length})`}>
          {item.columns.map((col, i) => (
            <div key={i} className="ueflow-details-param-row">
              <span className="ueflow-details-param-name">{col}</span>
            </div>
          ))}
        </CollapsibleSection>
      )}
    </>
  );
}

export const DetailsPanel: FC<DetailsPanelProps> = ({ item, onClose }) => {
  return (
    <div className="ueflow-details-panel">
      <div className="ueflow-details-header">
        <span className="ueflow-details-title">{item.name}</span>
        <button className="ueflow-details-close" onClick={onClose} aria-label="Close details">&times;</button>
      </div>
      <div className="ueflow-details-badge">{item.kind}</div>
      <div className="ueflow-details-content">
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
