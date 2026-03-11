/**
 * Right-click context menu for nodes and edges.
 * Positioned at the click coordinates via CSS absolute positioning.
 */
import { useEffect, useRef, type FC } from 'react';

export interface ContextMenuAction {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export const ContextMenu: FC<ContextMenuProps> = ({ x, y, actions, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) {
      ref.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > vh) {
      ref.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="ueflow-context-menu"
      style={{ position: 'fixed', left: x, top: y }}
    >
      {actions.map((action, i) => (
        <button
          key={i}
          className={`ueflow-context-menu-item${action.danger ? ' ueflow-context-menu-item--danger' : ''}${action.disabled ? ' ueflow-context-menu-item--disabled' : ''}`}
          onClick={() => { if (!action.disabled) { action.onClick(); onClose(); } }}
          disabled={action.disabled}
        >
          <span className="ueflow-context-menu-label">{action.label}</span>
          {action.shortcut && (
            <span className="ueflow-context-menu-shortcut">{action.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );
};
