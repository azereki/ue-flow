import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, useStore } from '@xyflow/react';
import { NodeHeader } from './NodeHeader';
import { PinHandle } from './PinHandle';
import { PinValueEditor } from './PinValueEditor';
import type { FlowNodeData } from '../transform/json-to-flow';
import { isExecPin, PIN_COLORS } from '../types/pin-types';
import { zoomSelector } from '../utils/selectors';

export const BlueprintNode = memo(({ data }: NodeProps) => {
  const { title, ueType, pins } = data as unknown as FlowNodeData;
  const zoom = useStore(zoomSelector);

  // Reroute nodes: minimal 16px dot
  if (ueType === 'reroute') {
    const pin = pins[0];
    const color = pin ? (PIN_COLORS[pin.category] ?? '#808080') : '#808080';
    return (
      <div className="ueflow-reroute-node">
        <Handle type="target" position={Position.Left} id={pins.find(p => p.direction === 'input')?.id} className="ueflow-handle" style={{ '--pin-color': color, opacity: 0 } as React.CSSProperties} />
        <div className="ueflow-reroute-dot" style={{ background: color }} />
        <Handle type="source" position={Position.Right} id={pins.find(p => p.direction === 'output')?.id} className="ueflow-handle" style={{ '--pin-color': color, opacity: 0 } as React.CSSProperties} />
      </div>
    );
  }

  const inputPins = pins.filter((p) => p.direction === 'input' && !p.hidden);
  const outputPins = pins.filter((p) => p.direction === 'output' && !p.hidden);

  const showPinBody = zoom >= 0.15;

  return (
    <div className="ueflow-node" data-ue-type={ueType}>
      <NodeHeader title={title} ueType={ueType} />
      {showPinBody && (
        <div className="ueflow-node-body">
          <div className="ueflow-pins-column ueflow-pins--input">
            {inputPins.map((pin) => (
              <div key={pin.id} className="ueflow-pin-row">
                <PinHandle pin={pin} />
                {!isExecPin(pin.category) && pin.defaultValue && (
                  <PinValueEditor pin={pin} />
                )}
              </div>
            ))}
          </div>
          <div className="ueflow-pins-column ueflow-pins--output">
            {outputPins.map((pin) => (
              <PinHandle key={pin.id} pin={pin} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
