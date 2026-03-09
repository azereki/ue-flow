/**
 * "+" button for adding dynamic pins on nodes that support them.
 */
import type { FC } from 'react';

interface DynamicPinButtonProps {
  onAdd: () => void;
  direction: 'input' | 'output';
}

export const DynamicPinButton: FC<DynamicPinButtonProps> = ({ onAdd, direction }) => {
  return (
    <button
      className={`ueflow-dynamic-pin-btn ueflow-dynamic-pin-btn--${direction}`}
      onClick={(e) => { e.stopPropagation(); onAdd(); }}
      title="Add pin"
    >
      +
    </button>
  );
};
