import { Handle, Position, useStore } from '@xyflow/react';
import { useCallback, type FC } from 'react';
import type { UEPin } from '../types/ue-graph';
import { PIN_COLORS, isExecPin } from '../types/pin-types';

interface PinHandleProps {
  pin: UEPin;
}

export const PinHandle: FC<PinHandleProps> = ({ pin }) => {
  const isInput = pin.direction === 'input';
  const type = isInput ? 'target' : 'source';
  const isConnected = useStore(
    useCallback(
      (s: { edges: Array<{ sourceHandle?: string | null; targetHandle?: string | null }> }) =>
        s.edges.some((e) => (isInput ? e.targetHandle : e.sourceHandle) === pin.id),
      [pin.id, isInput],
    ),
  );
  const color = PIN_COLORS[pin.category] ?? '#808080';
  const isExec = isExecPin(pin.category);
  const label = pin.friendlyName || pin.name;

  return (
    <div className={`ueflow-pin ueflow-pin--${pin.direction}`}>
      <Handle
        type={type}
        position={isInput ? Position.Left : Position.Right}
        id={pin.id}
        className={`ueflow-handle ${isExec ? 'ueflow-handle--exec' : 'ueflow-handle--data'} ${isConnected ? 'ueflow-handle--connected' : ''}`}
        style={{ '--pin-color': color } as React.CSSProperties}
        isConnectable={false}
      />
      {!isExec && <span className="ueflow-pin-label">{label}</span>}
    </div>
  );
};
