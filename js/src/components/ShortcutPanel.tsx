import { useEffect, useRef, type FC } from 'react';

interface ShortcutPanelProps {
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: '?', description: 'Show keyboard shortcuts' },
      { keys: 'Tab', description: 'Open node palette' },
      { keys: 'Ctrl + F', description: 'Search nodes and pins' },
      { keys: 'Ctrl + B', description: 'Bookmarks panel' },
      { keys: 'Escape', description: 'Close panel / deselect' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: 'Delete / Backspace', description: 'Delete selected' },
      { keys: 'Ctrl + D', description: 'Duplicate selected nodes' },
      { keys: 'Ctrl + C', description: 'Copy selected nodes' },
      { keys: 'Ctrl + V', description: 'Paste nodes' },
      { keys: 'Ctrl + X', description: 'Cut selected nodes' },
      { keys: 'Ctrl + Z', description: 'Undo' },
      { keys: 'Ctrl + Shift + Z', description: 'Redo' },
    ],
  },
  {
    title: 'Graph',
    shortcuts: [
      { keys: 'Q', description: 'Straighten connections' },
      { keys: 'Right-click canvas', description: 'Open node palette' },
      { keys: 'Right-click node', description: 'Node context menu' },
      { keys: 'Right-click pin', description: 'Delete connection(s)' },
      { keys: 'Ctrl / Shift + drag variable', description: 'Create Set node' },
    ],
  },
];

/**
 * Renders a shortcut key string as one or more <kbd> elements.
 *
 * Handles two levels of structure:
 *   1. " / " separates alternative keys  (e.g. "Delete / Backspace")
 *   2. " + " separates combo parts       (e.g. "Ctrl + Shift + Z")
 */
function ShortcutKeys({ keys }: { keys: string }) {
  const alternatives = keys.split(' / ');

  return (
    <span className="ueflow-shortcut-keys">
      {alternatives.map((alt, altIdx) => {
        const parts = alt.split(' + ');
        return (
          <span key={altIdx} className="ueflow-shortcut-alt">
            {altIdx > 0 && (
              <span className="ueflow-shortcut-separator">/</span>
            )}
            {parts.map((part, partIdx) => (
              <span key={partIdx} className="ueflow-shortcut-combo-part">
                {partIdx > 0 && (
                  <span className="ueflow-shortcut-plus">+</span>
                )}
                <kbd className="ueflow-shortcut-kbd">{part.trim()}</kbd>
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

export const ShortcutPanel: FC<ShortcutPanelProps> = ({ onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  return (
    <div className="ueflow-shortcut-backdrop">
      <div ref={ref} className="ueflow-shortcut-panel" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts">
        <div className="ueflow-shortcut-header">
          <span className="ueflow-shortcut-title">Keyboard Shortcuts</span>
          <button className="ueflow-shortcut-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="ueflow-shortcut-body">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="ueflow-shortcut-group">
              <div className="ueflow-shortcut-group-title">{group.title}</div>
              {group.shortcuts.map((s) => (
                <div key={s.keys} className="ueflow-shortcut-row">
                  <ShortcutKeys keys={s.keys} />
                  <span className="ueflow-shortcut-desc">{s.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
