import { useState, useCallback, useEffect, type FC } from 'react';
import { PIN_COLORS, classifyPinType } from '../types/pin-types';
import type { PropertyField } from '../types/ue-graph';

// ─── Exported Types ──────────────────────────────────────────────────────────

export type DetailsItem =
  | { kind: 'event'; name: string; params?: Array<{ name: string; type: string }>; replicates?: string; reliable?: boolean; callInEditor?: boolean; accessSpecifier?: string; keywords?: string }
  | { kind: 'function'; name: string; category?: string; pure?: boolean; description?: string; keywords?: string; compactTitle?: string; callInEditor?: boolean; accessSpecifier?: string; inputs?: Array<{ name: string; type: string }>; outputs?: Array<{ name: string; type: string }> }
  | { kind: 'variable'; name: string; type: string; category?: string; replication?: string; default?: string; containerType?: string; innerType?: string; keyType?: string; instanceEditable?: boolean; exposeOnSpawn?: boolean; private?: boolean; transient?: boolean; saveGame?: boolean }
  | { kind: 'struct'; name: string; fields: Array<{ name: string; type: string; default?: string }> }
  | { kind: 'delegate'; name: string; signature?: string; params?: Array<{ name: string; type: string }> }
  | { kind: 'datatable'; name: string; rowCount: number; columns?: string[] }
  | { kind: 'component'; name: string; componentClass: string; parent?: string; properties?: Record<string, Record<string, PropertyField>> }
  | { kind: 'macro'; name: string; category?: string; inputs?: Array<{ name: string; type: string }>; outputs?: Array<{ name: string; type: string }> };

export interface StructDef {
  name: string;
  fields: Array<{ name: string; type: string; default?: string }>;
}

interface DetailsPanelProps {
  item: DetailsItem;
  onClose: () => void;
  structs?: StructDef[];
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function typeColor(type: string | undefined): string {
  return PIN_COLORS[classifyPinType(type)];
}

function shouldShow(search: string, ...labels: string[]): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

// ─── Shared Sub-Components ───────────────────────────────────────────────────

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

/** Built-in struct field definitions for common engine types. */
const BUILTIN_STRUCTS: Record<string, Array<{ name: string; type: string }>> = {
  FVector: [{ name: 'X', type: 'float' }, { name: 'Y', type: 'float' }, { name: 'Z', type: 'float' }],
  Vector: [{ name: 'X', type: 'float' }, { name: 'Y', type: 'float' }, { name: 'Z', type: 'float' }],
  FRotator: [{ name: 'Pitch', type: 'float' }, { name: 'Yaw', type: 'float' }, { name: 'Roll', type: 'float' }],
  Rotator: [{ name: 'Pitch', type: 'float' }, { name: 'Yaw', type: 'float' }, { name: 'Roll', type: 'float' }],
  FTransform: [{ name: 'Rotation', type: 'Rotator' }, { name: 'Translation', type: 'Vector' }, { name: 'Scale3D', type: 'Vector' }],
  Transform: [{ name: 'Rotation', type: 'Rotator' }, { name: 'Translation', type: 'Vector' }, { name: 'Scale3D', type: 'Vector' }],
  FLinearColor: [{ name: 'R', type: 'float' }, { name: 'G', type: 'float' }, { name: 'B', type: 'float' }, { name: 'A', type: 'float' }],
  LinearColor: [{ name: 'R', type: 'float' }, { name: 'G', type: 'float' }, { name: 'B', type: 'float' }, { name: 'A', type: 'float' }],
  FVector2D: [{ name: 'X', type: 'float' }, { name: 'Y', type: 'float' }],
  Vector2D: [{ name: 'X', type: 'float' }, { name: 'Y', type: 'float' }],
};

function resolveSubFields(type: string, structs?: StructDef[]): Array<{ name: string; type: string; default?: string }> | undefined {
  if (BUILTIN_STRUCTS[type]) return BUILTIN_STRUCTS[type];
  const found = structs?.find(s => s.name === type);
  return found?.fields;
}

const ExpandableParamRow: FC<{ name: string; type: string; value?: string; structs?: StructDef[]; depth?: number }> = ({ name, type, value, structs, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const subFields = resolveSubFields(type, structs);
  const hasChildren = !!subFields && subFields.length > 0;

  return (
    <>
      <div className="ueflow-details-param-row" style={{ paddingLeft: `${18 + depth * 12}px` }}>
        {hasChildren ? (
          <button className="ueflow-param-expand" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse' : 'Expand'}>
            <span className={`ueflow-details-section-arrow ${expanded ? '' : 'ueflow-collapsed'}`}>&#9660;</span>
          </button>
        ) : (
          <span className="ueflow-param-expand-spacer" />
        )}
        <TypeDot type={type} />
        <span className="ueflow-details-param-name">{name}</span>
        <span className="ueflow-details-param-type">{type}</span>
        {value && <span className="ueflow-details-param-value">{value}</span>}
      </div>
      {expanded && subFields && subFields.map((sf, i) => (
        <ExpandableParamRow key={i} name={sf.name} type={sf.type} value={sf.default} structs={structs} depth={depth + 1} />
      ))}
    </>
  );
};

const ParamRow: FC<{ name: string; type: string; value?: string; structs?: StructDef[] }> = ({ name, type, value, structs }) => (
  <ExpandableParamRow name={name} type={type} value={value} structs={structs} />
);

// ─── Editable Field Components ───────────────────────────────────────────────

const FieldText: FC<{ label: string; value: string; onChange: (v: string) => void; mono?: boolean }> = ({ label, value, onChange, mono }) => (
  <div className="ueflow-field-row">
    <span className="ueflow-field-label">{label}</span>
    <input className={`ueflow-field-text${mono ? ' ueflow-field-mono' : ''}`} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const FieldNumber: FC<{ label: string; value: number; onChange: (v: number) => void; step?: number }> = ({ label, value, onChange, step }) => (
  <div className="ueflow-field-row">
    <span className="ueflow-field-label">{label}</span>
    <input className="ueflow-field-number" type="number" value={value} step={step} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
  </div>
);

const FieldCheckbox: FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <div className="ueflow-field-row">
    <span className="ueflow-field-label">{label}</span>
    <input className="ueflow-field-checkbox" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </div>
);

const FieldDropdown: FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
  <div className="ueflow-field-row">
    <span className="ueflow-field-label">{label}</span>
    <select className="ueflow-field-dropdown" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const FieldSegmented: FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
  <div className="ueflow-field-row">
    <span className="ueflow-field-label">{label}</span>
    <div className="ueflow-field-segmented">
      {options.map(opt => (
        <button key={opt} className={`ueflow-field-segment${opt === value ? ' ueflow-field-segment--active' : ''}`} onClick={() => onChange(opt)}>{opt}</button>
      ))}
    </div>
  </div>
);

const FieldVector: FC<{ label: string; value: number[]; onChange: (v: number[]) => void }> = ({ label, value, onChange }) => (
  <div className="ueflow-field-row ueflow-field-row--vector">
    <span className="ueflow-field-label">{label}</span>
    <div className="ueflow-field-vector">
      {value.map((v, i) => (
        <input
          key={i}
          className={`ueflow-field-number ueflow-field-vector-input ueflow-field-vector--${['x', 'y', 'z'][i]}`}
          type="number"
          value={v}
          step={0.1}
          onChange={(e) => { const next = [...value]; next[i] = parseFloat(e.target.value) || 0; onChange(next); }}
        />
      ))}
    </div>
  </div>
);

const FieldReadonly: FC<{ label: string; value: string; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div className="ueflow-field-row">
    <span className="ueflow-field-label">{label}</span>
    <span className="ueflow-field-value">{children}{value}</span>
  </div>
);

const FieldArrayBadge: FC<{ label: string; count: number }> = ({ label, count }) => (
  <div className="ueflow-field-row">
    <span className="ueflow-field-label">{label}</span>
    <span className="ueflow-field-array-badge">{count} Array element</span>
  </div>
);

// ─── Detail Section: Events ──────────────────────────────────────────────────

function EventDetails({ item, search, edits, set, structs }: { item: Extract<DetailsItem, { kind: 'event' }>; search: string; edits: Record<string, unknown>; set: (k: string, v: unknown) => void; structs?: StructDef[] }) {
  const replicateOptions = ['NotReplicated', 'Multicast', 'RunOnServer', 'RunOnClient'];
  const accessOptions = ['Public', 'Protected', 'Private'];

  const graphFields = [
    { label: 'Replicates', show: true },
    { label: 'Reliable', show: item.replicates !== undefined && item.replicates !== 'NotReplicated' },
    { label: 'Call In Editor', show: true },
    { label: 'Access Specifier', show: true },
    { label: 'Keywords', show: true },
  ];
  const graphVisible = graphFields.some(f => f.show && shouldShow(search, 'Graph', f.label));

  return (
    <>
      {graphVisible && (
        <CollapsibleSection title="Graph">
          {shouldShow(search, 'Graph', 'Replicates') && (
            <FieldDropdown label="Replicates" value={(edits['replicates'] as string) ?? item.replicates ?? 'NotReplicated'} options={replicateOptions} onChange={(v) => set('replicates', v)} />
          )}
          {(item.replicates !== undefined && item.replicates !== 'NotReplicated') && shouldShow(search, 'Graph', 'Reliable') && (
            <FieldCheckbox label="Reliable" checked={(edits['reliable'] as boolean) ?? item.reliable ?? false} onChange={(v) => set('reliable', v)} />
          )}
          {shouldShow(search, 'Graph', 'Call In Editor') && (
            <FieldCheckbox label="Call In Editor" checked={(edits['callInEditor'] as boolean) ?? item.callInEditor ?? false} onChange={(v) => set('callInEditor', v)} />
          )}
          {shouldShow(search, 'Graph', 'Access Specifier') && (
            <FieldDropdown label="Access Specifier" value={(edits['accessSpecifier'] as string) ?? item.accessSpecifier ?? 'Public'} options={accessOptions} onChange={(v) => set('accessSpecifier', v)} />
          )}
          {shouldShow(search, 'Graph', 'Keywords') && (
            <FieldText label="Keywords" value={(edits['keywords'] as string) ?? item.keywords ?? ''} onChange={(v) => set('keywords', v)} mono />
          )}
        </CollapsibleSection>
      )}
      {shouldShow(search, 'Inputs') && (
        <CollapsibleSection title="Inputs">
          {item.params && item.params.length > 0 ? (
            item.params.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} structs={structs} />)
          ) : (
            <div className="ueflow-details-empty">No parameters</div>
          )}
        </CollapsibleSection>
      )}
    </>
  );
}

// ─── Detail Section: Functions ────────────────────────────────────────────────

function FunctionDetails({ item, search, edits, set, structs }: { item: Extract<DetailsItem, { kind: 'function' }>; search: string; edits: Record<string, unknown>; set: (k: string, v: unknown) => void; structs?: StructDef[] }) {
  const accessOptions = ['Public', 'Protected', 'Private'];

  const graphVisible = shouldShow(search, 'Graph', 'Description', 'Category', 'Keywords', 'Compact Title', 'Pure', 'Call In Editor', 'Access Specifier');

  return (
    <>
      {graphVisible && (
        <CollapsibleSection title="Graph">
          {shouldShow(search, 'Graph', 'Description') && (
            <FieldText label="Description" value={(edits['description'] as string) ?? item.description ?? ''} onChange={(v) => set('description', v)} />
          )}
          {shouldShow(search, 'Graph', 'Category') && (
            <FieldText label="Category" value={(edits['category'] as string) ?? item.category ?? ''} onChange={(v) => set('category', v)} />
          )}
          {shouldShow(search, 'Graph', 'Keywords') && (
            <FieldText label="Keywords" value={(edits['keywords'] as string) ?? item.keywords ?? ''} onChange={(v) => set('keywords', v)} mono />
          )}
          {shouldShow(search, 'Graph', 'Compact Title') && (
            <FieldText label="Compact Title" value={(edits['compactTitle'] as string) ?? item.compactTitle ?? ''} onChange={(v) => set('compactTitle', v)} />
          )}
          {shouldShow(search, 'Graph', 'Pure') && (
            <FieldCheckbox label="Pure" checked={(edits['pure'] as boolean) ?? item.pure ?? false} onChange={(v) => set('pure', v)} />
          )}
          {shouldShow(search, 'Graph', 'Call In Editor') && (
            <FieldCheckbox label="Call In Editor" checked={(edits['callInEditor'] as boolean) ?? item.callInEditor ?? false} onChange={(v) => set('callInEditor', v)} />
          )}
          {shouldShow(search, 'Graph', 'Access Specifier') && (
            <FieldDropdown label="Access Specifier" value={(edits['accessSpecifier'] as string) ?? item.accessSpecifier ?? 'Public'} options={accessOptions} onChange={(v) => set('accessSpecifier', v)} />
          )}
        </CollapsibleSection>
      )}
      {shouldShow(search, 'Inputs') && (
        <CollapsibleSection title="Inputs">
          {item.inputs && item.inputs.length > 0 ? (
            item.inputs.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} structs={structs} />)
          ) : (
            <div className="ueflow-details-empty">No inputs</div>
          )}
        </CollapsibleSection>
      )}
      {shouldShow(search, 'Outputs') && (
        <CollapsibleSection title="Outputs">
          {item.outputs && item.outputs.length > 0 ? (
            item.outputs.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} structs={structs} />)
          ) : (
            <div className="ueflow-details-empty">No outputs</div>
          )}
        </CollapsibleSection>
      )}
    </>
  );
}

// ─── Detail Section: Variables ────────────────────────────────────────────────

/** Parse UE container default value format: "(elem1,elem2,...)" or empty "()" */
function parseContainerValue(value: string | undefined): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (trimmed === '()' || trimmed === '') return [];
  // Strip outer parens if present
  const inner = trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed.slice(1, -1) : trimmed;
  if (!inner) return [];
  return inner.split(',').map(s => s.trim());
}

/** Container element list — expandable section showing indexed entries. */
const ContainerElementList: FC<{ elements: string[]; containerType: string; innerType?: string; keyType?: string }> = ({ elements, containerType, innerType, keyType }) => {
  const [expanded, setExpanded] = useState(false);
  const label = containerType === 'Map' ? 'Map' : containerType === 'Set' ? 'Set' : 'Array';
  const count = elements.length;
  const summary = `${count} ${label} element${count !== 1 ? 's' : ''}`;

  return (
    <div className="ueflow-container-editor">
      <button className="ueflow-container-summary" onClick={() => setExpanded(!expanded)}>
        <span className={`ueflow-details-section-arrow ${expanded ? '' : 'ueflow-collapsed'}`}>&#9660;</span>
        <span className="ueflow-container-badge">{summary}</span>
      </button>
      {expanded && elements.length > 0 && (
        <div className="ueflow-container-entries">
          {elements.map((elem, i) => (
            <div key={i} className="ueflow-container-entry">
              <span className="ueflow-container-index">[{i}]</span>
              {containerType === 'Map' ? (
                <>
                  <TypeDot type={keyType ?? ''} />
                  <span className="ueflow-container-value">{elem.split(':')[0] ?? elem}</span>
                  <span className="ueflow-container-arrow">&rarr;</span>
                  <TypeDot type={innerType ?? ''} />
                  <span className="ueflow-container-value">{elem.split(':')[1] ?? ''}</span>
                </>
              ) : (
                <>
                  <TypeDot type={innerType ?? ''} />
                  <span className="ueflow-container-value">{elem}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function VariableDetails({ item, search, edits, set }: { item: Extract<DetailsItem, { kind: 'variable' }>; search: string; edits: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const replicationOptions = ['None', 'Replicated', 'RepNotify'];
  const isContainer = !!item.containerType;
  const containerElements = isContainer ? parseContainerValue(item.default) : [];

  return (
    <>
      {shouldShow(search, 'Variable', 'Type') && (
        <CollapsibleSection title="Variable">
          {shouldShow(search, 'Variable', 'Type') && (
            <FieldReadonly label="Type" value={item.type}>
              <TypeDot type={item.innerType || item.type} />{' '}
            </FieldReadonly>
          )}
          {shouldShow(search, 'Variable', 'Category') && (
            <FieldText label="Category" value={(edits['category'] as string) ?? item.category ?? ''} onChange={(v) => set('category', v)} />
          )}
          {shouldShow(search, 'Variable', 'Replication') && (
            <FieldDropdown label="Replication" value={(edits['replication'] as string) ?? item.replication ?? 'None'} options={replicationOptions} onChange={(v) => set('replication', v)} />
          )}
          {shouldShow(search, 'Variable', 'Default') && !isContainer && (
            <FieldText label="Default Value" value={(edits['default'] as string) ?? item.default ?? ''} onChange={(v) => set('default', v)} mono />
          )}
          {shouldShow(search, 'Variable', 'Default') && isContainer && (
            <ContainerElementList elements={containerElements} containerType={item.containerType!} innerType={item.innerType} keyType={item.keyType} />
          )}
          {shouldShow(search, 'Variable', 'Instance Editable') && (
            <FieldCheckbox label="Instance Editable" checked={(edits['instanceEditable'] as boolean) ?? item.instanceEditable ?? false} onChange={(v) => set('instanceEditable', v)} />
          )}
          {shouldShow(search, 'Variable', 'Expose on Spawn') && (
            <FieldCheckbox label="Expose on Spawn" checked={(edits['exposeOnSpawn'] as boolean) ?? item.exposeOnSpawn ?? false} onChange={(v) => set('exposeOnSpawn', v)} />
          )}
          {shouldShow(search, 'Variable', 'Private') && (
            <FieldCheckbox label="Private" checked={(edits['private'] as boolean) ?? item.private ?? false} onChange={(v) => set('private', v)} />
          )}
          {shouldShow(search, 'Variable', 'Transient') && (
            <FieldCheckbox label="Transient" checked={(edits['transient'] as boolean) ?? item.transient ?? false} onChange={(v) => set('transient', v)} />
          )}
          {shouldShow(search, 'Variable', 'Save Game') && (
            <FieldCheckbox label="Save Game" checked={(edits['saveGame'] as boolean) ?? item.saveGame ?? false} onChange={(v) => set('saveGame', v)} />
          )}
        </CollapsibleSection>
      )}
      {isContainer && shouldShow(search, 'Container', 'Element Type', 'Key Type', 'Value Type') && (
        <CollapsibleSection title="Container">
          <FieldReadonly label="Container" value={item.containerType!} />
          {item.containerType === 'Map' && item.keyType && (
            <FieldReadonly label="Key Type" value={item.keyType}>
              <TypeDot type={item.keyType} />{' '}
            </FieldReadonly>
          )}
          <FieldReadonly label={item.containerType === 'Map' ? 'Value Type' : 'Element Type'} value={item.innerType ?? 'unknown'}>
            <TypeDot type={item.innerType ?? ''} />{' '}
          </FieldReadonly>
        </CollapsibleSection>
      )}
    </>
  );
}

// ─── Detail Section: Components ───────────────────────────────────────────────

function ComponentDetails({ item, search, edits, set }: { item: Extract<DetailsItem, { kind: 'component' }>; search: string; edits: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const properties = item.properties;

  // Render a single property field based on its type
  const renderField = (sectionName: string, fieldName: string, field: PropertyField) => {
    const key = `${sectionName}.${fieldName}`;
    switch (field.type) {
      case 'string':
        return <FieldText key={key} label={fieldName} value={(edits[key] as string) ?? (field.value as string)} onChange={(v) => set(key, v)} />;
      case 'number':
        return <FieldNumber key={key} label={fieldName} value={(edits[key] as number) ?? (field.value as number)} onChange={(v) => set(key, v)} />;
      case 'bool':
        return <FieldCheckbox key={key} label={fieldName} checked={(edits[key] as boolean) ?? (field.value as boolean)} onChange={(v) => set(key, v)} />;
      case 'vector':
        return <FieldVector key={key} label={fieldName} value={(edits[key] as number[]) ?? (field.value as number[])} onChange={(v) => set(key, v)} />;
      case 'enum':
        return <FieldDropdown key={key} label={fieldName} value={(edits[key] as string) ?? (field.value as string)} options={field.options ?? []} onChange={(v) => set(key, v)} />;
      case 'segmented':
        return <FieldSegmented key={key} label={fieldName} value={(edits[key] as string) ?? (field.value as string)} options={field.options ?? []} onChange={(v) => set(key, v)} />;
      case 'array':
        return <FieldArrayBadge key={key} label={fieldName} count={Array.isArray(field.value) ? (field.value as unknown[]).length : 0} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Always show class and parent */}
      {shouldShow(search, 'Component', 'Class', 'Parent') && (
        <CollapsibleSection title="Component">
          {shouldShow(search, 'Component', 'Class') && (
            <FieldReadonly label="Class" value={item.componentClass} />
          )}
          {item.parent && shouldShow(search, 'Component', 'Parent') && (
            <FieldReadonly label="Parent" value={item.parent} />
          )}
        </CollapsibleSection>
      )}
      {/* Render property sections */}
      {properties && Object.entries(properties).map(([sectionName, fields]) => {
        const fieldEntries = Object.entries(fields);
        const visibleFields = fieldEntries.filter(([fn]) => shouldShow(search, sectionName, fn));
        if (visibleFields.length === 0) return null;
        return (
          <CollapsibleSection key={sectionName} title={sectionName}>
            {visibleFields.map(([fn, field]) => renderField(sectionName, fn, field))}
          </CollapsibleSection>
        );
      })}
    </>
  );
}

// ─── Detail Section: Structs ──────────────────────────────────────────────────

function StructDetails({ item, search, structs }: { item: Extract<DetailsItem, { kind: 'struct' }>; search: string; structs?: StructDef[] }) {
  if (!shouldShow(search, 'Fields')) return null;
  return (
    <CollapsibleSection title={`Fields (${item.fields.length})`}>
      {item.fields.map((f, i) => (
        <ParamRow key={i} name={f.name} type={f.type} value={f.default} structs={structs} />
      ))}
    </CollapsibleSection>
  );
}

// ─── Detail Section: Delegates ────────────────────────────────────────────────

function DelegateDetails({ item, search, edits, set, structs }: { item: Extract<DetailsItem, { kind: 'delegate' }>; search: string; edits: Record<string, unknown>; set: (k: string, v: unknown) => void; structs?: StructDef[] }) {
  return (
    <>
      {item.signature && shouldShow(search, 'Signature') && (
        <FieldText label="Signature" value={(edits['signature'] as string) ?? item.signature} onChange={(v) => set('signature', v)} mono />
      )}
      {item.params && item.params.length > 0 && shouldShow(search, 'Parameters') && (
        <CollapsibleSection title={`Parameters (${item.params.length})`}>
          {item.params.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} structs={structs} />)}
        </CollapsibleSection>
      )}
    </>
  );
}

// ─── Detail Section: Macros ───────────────────────────────────────────────────

function MacroDetails({ item, search, edits, set, structs }: { item: Extract<DetailsItem, { kind: 'macro' }>; search: string; edits: Record<string, unknown>; set: (k: string, v: unknown) => void; structs?: StructDef[] }) {
  return (
    <>
      {shouldShow(search, 'Category') && (
        <FieldText label="Category" value={(edits['category'] as string) ?? item.category ?? ''} onChange={(v) => set('category', v)} />
      )}
      {shouldShow(search, 'Inputs') && (
        <CollapsibleSection title="Inputs">
          {item.inputs && item.inputs.length > 0 ? (
            item.inputs.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} structs={structs} />)
          ) : (
            <div className="ueflow-details-empty">No inputs</div>
          )}
        </CollapsibleSection>
      )}
      {shouldShow(search, 'Outputs') && (
        <CollapsibleSection title="Outputs">
          {item.outputs && item.outputs.length > 0 ? (
            item.outputs.map((p, i) => <ParamRow key={i} name={p.name} type={p.type} structs={structs} />)
          ) : (
            <div className="ueflow-details-empty">No outputs</div>
          )}
        </CollapsibleSection>
      )}
    </>
  );
}

// ─── Detail Section: Data Tables ──────────────────────────────────────────────

function DataTableDetails({ item, search }: { item: Extract<DetailsItem, { kind: 'datatable' }>; search: string }) {
  return (
    <>
      {shouldShow(search, 'Rows') && (
        <FieldReadonly label="Rows" value={String(item.rowCount)} />
      )}
      {item.columns && item.columns.length > 0 && shouldShow(search, 'Columns') && (
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

// ─── Main Panel ──────────────────────────────────────────────────────────────

export const DetailsPanel: FC<DetailsPanelProps> = ({ item, onClose, structs }) => {
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, unknown>>({});

  // Reset edits and search when item changes
  useEffect(() => { setEdits({}); }, [item.name, item.kind]);

  const set = useCallback((key: string, value: unknown) => {
    setEdits(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="ueflow-details-panel">
      <div className="ueflow-details-header">
        <span className="ueflow-details-title">{item.name}</span>
        <button className="ueflow-details-close" onClick={onClose} aria-label="Close details">&times;</button>
      </div>
      <div className="ueflow-details-search">
        <input
          className="ueflow-details-search-input"
          type="text"
          placeholder="Search details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search details"
        />
        {search && (
          <button className="ueflow-details-search-clear" onClick={() => setSearch('')} aria-label="Clear search">&times;</button>
        )}
      </div>
      <div className="ueflow-details-badge">{item.kind}</div>
      <div className="ueflow-details-content">
        {item.kind === 'event' && <EventDetails item={item} search={search} edits={edits} set={set} structs={structs} />}
        {item.kind === 'function' && <FunctionDetails item={item} search={search} edits={edits} set={set} structs={structs} />}
        {item.kind === 'variable' && <VariableDetails item={item} search={search} edits={edits} set={set} />}
        {item.kind === 'struct' && <StructDetails item={item} search={search} structs={structs} />}
        {item.kind === 'delegate' && <DelegateDetails item={item} search={search} edits={edits} set={set} structs={structs} />}
        {item.kind === 'datatable' && <DataTableDetails item={item} search={search} />}
        {item.kind === 'component' && <ComponentDetails item={item} search={search} edits={edits} set={set} />}
        {item.kind === 'macro' && <MacroDetails item={item} search={search} edits={edits} set={set} structs={structs} />}
      </div>
    </div>
  );
};
