import { Handle, Position } from '@xyflow/react';
import type { FC } from 'react';
import type { UEPin } from '../types/ue-graph';
import { PIN_COLORS, isExecPin } from '../types/pin-types';

interface PinHandleProps {
  pin: UEPin;
  isConnected: boolean;
}

export const PinHandle: FC<PinHandleProps> = ({ pin, isConnected }) => {
  const isInput = pin.direction === 'input';
  const color = PIN_COLORS[pin.category] ?? '#808080';
  const isExec = isExecPin(pin.category);
  const label = pin.friendlyName || pin.name;

  return (
    <div className={`ueflow-pin ueflow-pin--${pin.direction}`}>
      <Handle
        type={isInput ? 'target' : 'source'}
        position={isInput ? Position.Left : Position.Right}
        id={pin.id}
        className={`ueflow-handle ${isExec ? 'ueflow-handle--exec' : 'ueflow-handle--data'} ${isConnected ? 'ueflow-handle--connected' : ''}`}
        style={{ '--pin-color': color } as React.CSSProperties}
      />
      <span className="ueflow-pin-label" style={isExec ? { color } : undefined}>
        {isExec ? '' : label}
      </span>
      {!isExec && pin.defaultValue && (
        <span className="ueflow-pin-value">{pin.defaultValue}</span>
      )}
    </div>
  );
};
