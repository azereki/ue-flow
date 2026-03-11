import { useState, useCallback, type FC } from 'react';

// ─── Friendly Labels ─────────────────────────────────────────────────────────

const FRIENDLY_LABELS: Record<string, string> = {
  FunctionReference: 'Function Reference',
  EventReference: 'Event Reference',
  VariableReference: 'Variable Reference',
  SignatureName: 'Signature Name',
  bOverrideFunction: 'Override Function',
  bIsPureFunc: 'Is Pure',
  bIsConstFunc: 'Is Const',
  bCallInEditor: 'Call In Editor',
  DelegateReference: 'Delegate Reference',
  bSelfContext: 'Self Context',
  MemberParent: 'Member Parent',
  MemberName: 'Member Name',
  ErrorType: 'Error Type',
  NodeComment: 'Node Comment',
  bCommentBubbleVisible: 'Comment Bubble Visible',
  AdvancedPinDisplay: 'Advanced Pin Display',
  EnabledState: 'Enabled State',
};

function friendlyLabel(key: string): string {
  return FRIENDLY_LABELS[key] ?? key;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PropertyInspectorProps {
  nodeId: string;
  properties: Record<string, string>;
  onUpdateProperty: (key: string, value: string) => void;
  onAddProperty: (key: string, value: string) => void;
  onRemoveProperty: (key: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PropertyInspector: FC<PropertyInspectorProps> = ({
  nodeId: _nodeId,
  properties,
  onUpdateProperty,
  onAddProperty,
  onRemoveProperty,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const entries = Object.entries(properties);

  const handleAddConfirm = useCallback(() => {
    const trimmedKey = newKey.trim();
    if (!trimmedKey) return;
    onAddProperty(trimmedKey, newValue);
    setNewKey('');
    setNewValue('');
    setAdding(false);
  }, [newKey, newValue, onAddProperty]);

  const handleAddKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAddConfirm();
      if (e.key === 'Escape') {
        setAdding(false);
        setNewKey('');
        setNewValue('');
      }
    },
    [handleAddConfirm],
  );

  return (
    <div className="ueflow-property-inspector">
      <button
        className="ueflow-property-inspector-header"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className={`ueflow-details-section-arrow ${collapsed ? 'ueflow-collapsed' : ''}`}>
          &#9660;
        </span>
        <span>Properties</span>
        <span className="ueflow-property-inspector-count">{entries.length}</span>
      </button>

      {!collapsed && (
        <div className="ueflow-property-inspector-body">
          {entries.length === 0 && !adding && (
            <div className="ueflow-property-inspector-empty">No properties</div>
          )}

          {entries.map(([key, value]) => (
            <PropertyRow
              key={key}
              propKey={key}
              propValue={value}
              onUpdate={onUpdateProperty}
              onRemove={onRemoveProperty}
            />
          ))}

          {adding && (
            <div className="ueflow-property-inspector-row ueflow-property-inspector-row--new">
              <input
                className="ueflow-property-inspector-input ueflow-property-inspector-key-input"
                type="text"
                placeholder="Key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={handleAddKeyDown}
                autoFocus
              />
              <input
                className="ueflow-property-inspector-input ueflow-property-inspector-value-input"
                type="text"
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handleAddKeyDown}
              />
              <button
                className="ueflow-property-inspector-btn ueflow-property-inspector-btn--confirm"
                onClick={handleAddConfirm}
                aria-label="Confirm add property"
                title="Add"
              >
                &#10003;
              </button>
              <button
                className="ueflow-property-inspector-btn ueflow-property-inspector-btn--cancel"
                onClick={() => {
                  setAdding(false);
                  setNewKey('');
                  setNewValue('');
                }}
                aria-label="Cancel add property"
                title="Cancel"
              >
                &times;
              </button>
            </div>
          )}

          <button
            className="ueflow-property-inspector-add"
            onClick={() => setAdding(true)}
            disabled={adding}
          >
            + Add Property
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Property Row ────────────────────────────────────────────────────────────

const PropertyRow: FC<{
  propKey: string;
  propValue: string;
  onUpdate: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}> = ({ propKey, propValue, onUpdate, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(propValue);

  const handleBlur = () => {
    setEditing(false);
    if (localValue !== propValue) {
      onUpdate(propKey, localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(propValue);
      setEditing(false);
    }
  };

  return (
    <div className="ueflow-property-inspector-row">
      <span className="ueflow-property-inspector-key" title={propKey}>
        {friendlyLabel(propKey)}
      </span>
      {editing ? (
        <input
          className="ueflow-property-inspector-input ueflow-property-inspector-value-input"
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span
          className="ueflow-property-inspector-value"
          onClick={() => {
            setLocalValue(propValue);
            setEditing(true);
          }}
          title="Click to edit"
        >
          {propValue || '\u00A0'}
        </span>
      )}
      <button
        className="ueflow-property-inspector-btn ueflow-property-inspector-btn--delete"
        onClick={() => onRemove(propKey)}
        aria-label={`Remove ${propKey}`}
        title="Remove property"
      >
        &times;
      </button>
    </div>
  );
};
