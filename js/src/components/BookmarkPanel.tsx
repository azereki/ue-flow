/**
 * Bookmark panel — Ctrl+B toggle. Lists saved viewport bookmarks with navigation.
 */
import { useEffect, useRef, type FC } from 'react';
import type { Bookmark } from '../hooks/useBookmarks';

interface BookmarkPanelProps {
  bookmarks: Bookmark[];
  onGoTo: (bookmark: Bookmark) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

export const BookmarkPanel: FC<BookmarkPanelProps> = ({ bookmarks, onGoTo, onRemove, onAdd, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div ref={ref} className="ueflow-bookmark-panel">
      <div className="ueflow-bookmark-header">
        <span className="ueflow-bookmark-title">Bookmarks</span>
        <button className="ueflow-bookmark-add" onClick={onAdd} title="Save current view">+</button>
        <button className="ueflow-bookmark-close" onClick={onClose}>&times;</button>
      </div>
      {bookmarks.length === 0 ? (
        <div className="ueflow-bookmark-empty">No bookmarks yet. Click + to save current view.</div>
      ) : (
        <div className="ueflow-bookmark-list">
          {bookmarks.map((bm) => (
            <div key={bm.id} className="ueflow-bookmark-item">
              <button
                className="ueflow-bookmark-goto"
                onClick={() => onGoTo(bm)}
                title={`${bm.graphName} — zoom ${Math.round(bm.viewport.zoom * 100)}%`}
              >
                <span className="ueflow-bookmark-label">{bm.label}</span>
                <span className="ueflow-bookmark-graph">{bm.graphName}</span>
              </button>
              <button className="ueflow-bookmark-remove" onClick={() => onRemove(bm.id)} title="Remove">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
