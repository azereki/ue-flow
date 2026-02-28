import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { PIN_COLORS, isExecPin, type PinCategory } from '../types/pin-types';

export const BlueprintEdge = memo((props: EdgeProps) => {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const category = (data?.category ?? 'wildcard') as PinCategory;
  const color = PIN_COLORS[category] ?? '#808080';
  const isExec = isExecPin(category);

  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 16 });

  return (
    <BaseEdge
      {...props}
      path={edgePath}
      style={{
        stroke: color,
        strokeWidth: isExec ? 4 : 2.5,
        strokeOpacity: 1.0,
        filter: `drop-shadow(0 0 3px ${color})`,
      }}
    />
  );
});

BlueprintEdge.displayName = 'BlueprintEdge';
