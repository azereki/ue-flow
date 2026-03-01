import { memo, useContext } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { PIN_COLORS, isExecPin, type PinCategory } from '../types/pin-types';
import { PinBodyContext } from '../contexts/PinBodyContext';

/** Lighten a hex color towards white for neon glow effect. */
function lightenHex(hex: string, amount = 0.4): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, Math.round(parseInt(h.substring(0, 2), 16) + (255 - parseInt(h.substring(0, 2), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(h.substring(2, 4), 16) + (255 - parseInt(h.substring(2, 4), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(h.substring(4, 6), 16) + (255 - parseInt(h.substring(4, 6), 16)) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export const BlueprintEdge = memo((props: EdgeProps) => {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const category = (data?.category ?? 'wildcard') as PinCategory;
  const color = PIN_COLORS[category] ?? '#808080';
  const isExec = isExecPin(category);
  const showDetail = useContext(PinBodyContext);

  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.25 });

  // Suppress glow at low zoom (imperceptible, saves GPU filter ops)
  const glowColor = lightenHex(color, 0.35);
  const filter = showDetail
    ? `drop-shadow(0 0 ${isExec ? '6px' : '4px'} ${glowColor})`
    : undefined;

  return (
    <BaseEdge
      {...props}
      path={edgePath}
      style={{
        stroke: color,
        strokeWidth: isExec ? 4 : 2.5,
        strokeOpacity: isExec ? 0.85 : 0.75,
        filter,
      }}
    />
  );
});

BlueprintEdge.displayName = 'BlueprintEdge';
