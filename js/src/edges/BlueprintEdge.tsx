import { memo, useContext } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { PIN_COLORS, isExecPin } from '../types/pin-types';
import { PinBodyContext } from '../contexts/PinBodyContext';
import type { BlueprintFlowEdge } from '../types/flow-types';

/** Lighten a hex color towards white for neon glow effect. */
function lightenHex(hex: string, amount = 0.4): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, Math.round(parseInt(h.substring(0, 2), 16) + (255 - parseInt(h.substring(0, 2), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(h.substring(2, 4), 16) + (255 - parseInt(h.substring(2, 4), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(h.substring(4, 6), 16) + (255 - parseInt(h.substring(4, 6), 16)) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export const BlueprintEdge = memo((props: EdgeProps<BlueprintFlowEdge>) => {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props;
  const category = data?.category ?? 'wildcard';
  const color = PIN_COLORS[category] ?? '#808080';
  const isExec = isExecPin(category);
  const showDetail = useContext(PinBodyContext);

  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 16 });

  // Selected edges: brighten stroke and amplify glow
  const strokeColor = selected ? lightenHex(color, 0.45) : color;
  const strokeWidth = selected ? (isExec ? 4 : 3) : (isExec ? 3 : 2);
  const strokeOpacity = selected ? 1 : (isExec ? 0.85 : 0.75);

  // Suppress glow at low zoom (imperceptible, saves GPU filter ops)
  const glowColor = lightenHex(color, selected ? 0.55 : 0.35);
  const glowSize = selected ? (isExec ? '10px' : '7px') : (isExec ? '6px' : '4px');
  const filter = showDetail
    ? `drop-shadow(0 0 ${glowSize} ${glowColor})`
    : undefined;

  return (
    <BaseEdge
      {...props}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        strokeOpacity,
        filter,
      }}
    />
  );
});

BlueprintEdge.displayName = 'BlueprintEdge';
