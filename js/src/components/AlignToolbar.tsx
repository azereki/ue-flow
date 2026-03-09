/**
 * Floating alignment toolbar — visible when 2+ nodes are selected.
 * Provides align, distribute, and straighten operations.
 */
import { type FC, useCallback } from 'react';
import type { AlignAxis, DistributeAxis } from '../utils/alignment';

interface AlignToolbarProps {
  onAlign: (axis: AlignAxis) => void;
  onDistribute: (axis: DistributeAxis) => void;
  onStraighten: () => void;
  selectedCount: number;
}

const ALIGN_BUTTONS: Array<{ axis: AlignAxis; label: string; icon: string }> = [
  { axis: 'left', label: 'Align Left', icon: '⫿' },
  { axis: 'center-h', label: 'Align Center H', icon: '⫾' },
  { axis: 'right', label: 'Align Right', icon: '⫿' },
  { axis: 'top', label: 'Align Top', icon: '⏜' },
  { axis: 'center-v', label: 'Align Center V', icon: '⏝' },
  { axis: 'bottom', label: 'Align Bottom', icon: '⏝' },
];

export const AlignToolbar: FC<AlignToolbarProps> = ({ onAlign, onDistribute, onStraighten, selectedCount }) => {
  const handleAlign = useCallback((axis: AlignAxis) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onAlign(axis);
  }, [onAlign]);

  return (
    <div className="ueflow-align-toolbar">
      <div className="ueflow-align-toolbar-group">
        {ALIGN_BUTTONS.map(({ axis, label }) => (
          <button
            key={axis}
            className="ueflow-align-toolbar-btn"
            title={label}
            onClick={handleAlign(axis)}
          >
            {label.replace('Align ', '').replace(' H', '').replace(' V', '').charAt(0)}
          </button>
        ))}
      </div>
      {selectedCount >= 3 && (
        <div className="ueflow-align-toolbar-group">
          <button
            className="ueflow-align-toolbar-btn"
            title="Distribute Horizontal"
            onClick={(e) => { e.stopPropagation(); onDistribute('horizontal'); }}
          >
            DH
          </button>
          <button
            className="ueflow-align-toolbar-btn"
            title="Distribute Vertical"
            onClick={(e) => { e.stopPropagation(); onDistribute('vertical'); }}
          >
            DV
          </button>
        </div>
      )}
      <div className="ueflow-align-toolbar-group">
        <button
          className="ueflow-align-toolbar-btn"
          title="Straighten (Q)"
          onClick={(e) => { e.stopPropagation(); onStraighten(); }}
        >
          Q
        </button>
      </div>
    </div>
  );
};
