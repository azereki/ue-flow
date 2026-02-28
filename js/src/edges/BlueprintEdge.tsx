import { memo } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { PIN_COLORS, isExecPin, type PinCategory } from '../types/pin-types';

export const BlueprintEdge = memo((props: EdgeProps) => {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const category = (data?.category ?? 'wildcard') as PinCategory;
  const color = PIN_COLORS[category] ?? '#808080';
  const isExec = isExecPin(category);

  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <BaseEdge
      {...props}
      path={edgePath}
      style={{
        stroke: color,
        strokeWidth: isExec ? 3 : 2,
        strokeOpacity: isExec ? 0.9 : 0.6,
      }}
    />
  );
});

BlueprintEdge.displayName = 'BlueprintEdge';
