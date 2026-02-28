import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeHeader } from './NodeHeader';
import { PinHandle } from './PinHandle';
import type { FlowNodeData } from '../transform/json-to-flow';

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
            <PinHandle key={pin.id} pin={pin} isConnected={false} />
          ))}
        </div>
        <div className="ueflow-pins-column ueflow-pins--output">
          {outputPins.map((pin) => (
            <PinHandle key={pin.id} pin={pin} isConnected={false} />
          ))}
        </div>
      </div>
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
