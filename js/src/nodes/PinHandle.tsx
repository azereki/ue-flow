import { Handle, Position } from '@xyflow/react';
import { memo, type FC } from 'react';
import type { UEPin } from '../types/ue-graph';
import { isExecPin, getExtendedPinColor } from '../types/pin-types';

function pinTooltip(pin: UEPin): string {
  const parts: string[] = [];
  const name = pin.friendlyName || pin.name;
  if (name) parts.push(name);

  if (pin.category === 'exec') {
    parts.push('Exec');
  } else {
    let typeStr: string = pin.category;
    if (pin.subCategoryObject) typeStr = pin.subCategoryObject;
    else if (pin.subCategory) typeStr = pin.subCategory;
    if (pin.containerType) typeStr = `${pin.containerType}<${typeStr}>`;
    parts.push(typeStr);
  }

  if (pin.isReference) parts.push('(by ref)');
  if (pin.isConst) parts.push('(const)');
  if (pin.defaultValue) parts.push(`Default: ${pin.defaultValue}`);
  if (pin.description) parts.push(pin.description);

  return parts.join(' \u2014 ');
}

/** Format a default value hint for inline display on unconnected pins. */
function formatDefaultHint(pin: UEPin): string {
  const v = pin.defaultValue;
  if (!v) return '';
  // Booleans
  if (pin.category === 'bool') return v.toLowerCase() === 'true' ? 'true' : 'false';
  // Object refs — show just the asset name
  if (pin.category === 'object' || pin.category === 'softobject' || pin.category === 'class' || pin.category === 'softclass') {
    const last = v.split('.').pop() ?? v;
    return last.length > 20 ? last.slice(0, 17) + '...' : last;
  }
  // Truncate long values
  return v.length > 20 ? v.slice(0, 17) + '...' : v;
}

export interface PinHandleProps {
  pin: UEPin;
  /** Whether this pin has at least one connected edge. Provided by the parent BlueprintNode. */
  isConnected?: boolean;
  /** Live edited value — overrides pin.defaultValue for the inline hint. */
  editedValue?: string;
}

export const PinHandle: FC<PinHandleProps> = memo(({ pin, isConnected = false, editedValue }) => {
  const isInput = pin.direction === 'input';
  const type = isInput ? 'target' : 'source';
  const color = getExtendedPinColor(pin);
  const isExec = isExecPin(pin.category);
  const rawLabel = pin.friendlyName || pin.name;
  const containerClass = pin.containerType ? `ueflow-handle--container-${pin.containerType.toLowerCase()}` : '';

  // Show container type in label: "Array<Float>" style
  let label = rawLabel;
  if (pin.containerType && rawLabel) {
    label = `${rawLabel}`;
  }

  return (
    <div className={`ueflow-pin ueflow-pin--${pin.direction}`} title={pinTooltip(pin)}>
      <Handle
        type={type}
        position={isInput ? Position.Left : Position.Right}
        id={pin.id}
        className={`ueflow-handle ${isExec ? 'ueflow-handle--exec' : 'ueflow-handle--data'} ${isConnected ? 'ueflow-handle--connected' : ''} ${containerClass} ${pin.isReference ? 'ueflow-handle--reference' : ''} ${pin.category === 'delegate' ? 'ueflow-handle--delegate' : ''}`}
        style={{ '--pin-color': color } as React.CSSProperties}
        isConnectable={false}
      />
      {label && <span className="ueflow-pin-label">{label}</span>}
      {isInput && pin.defaultValue && !isExec && !isConnected && (
        <span className="ueflow-pin-default-hint">= {formatDefaultHint(editedValue !== undefined ? { ...pin, defaultValue: editedValue } : pin)}</span>
      )}
    </div>
  );
});

PinHandle.displayName = 'PinHandle';
