import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeHeader } from './NodeHeader';
import { PinHandle } from './PinHandle';
import { PinValueEditor } from './PinValueEditor';
import type { FlowNodeData } from '../transform/json-to-flow';
import { isExecPin } from '../types/pin-types';

export const BlueprintNode = memo(({ data }: NodeProps) => {
  const { title, ueType, category, pins } = data as unknown as FlowNodeData;
  const inputPins = pins.filter((p) => p.direction === 'input' && !p.hidden);
  const outputPins = pins.filter((p) => p.direction === 'output' && !p.hidden);

  return (
    <div className="ueflow-node" data-ue-type={ueType}>
      <NodeHeader title={title} ueType={ueType} category={category} />
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
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
