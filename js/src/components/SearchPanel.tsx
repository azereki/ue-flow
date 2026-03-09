/**
 * Ctrl+F search overlay — searches nodes, pins, comments across graphs.
 */
import { useRef, useEffect, type FC } from 'react';
import type { SearchResult } from '../hooks/useSearch';

interface SearchPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
  onClose: () => void;
}

const MATCH_ICONS: Record<string, string> = {
  title: 'N',
  pin: 'P',
  comment: 'C',
  pinValue: 'V',
};

export const SearchPanel: FC<SearchPanelProps> = ({ query, onQueryChange, results, onSelectResult, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="ueflow-search-panel">
      <div className="ueflow-search-header">
        <input
          ref={inputRef}
          className="ueflow-search-input"
          type="text"
          placeholder="Search nodes, pins, comments..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <button className="ueflow-search-close" onClick={onClose}>
          &times;
        </button>
      </div>
      {results.length > 0 && (
        <div className="ueflow-search-results">
          {results.slice(0, 50).map((r, i) => (
            <button
              key={`${r.graphName}-${r.nodeId}-${i}`}
              className="ueflow-search-result"
              onClick={() => { onSelectResult(r); onClose(); }}
            >
              <span className="ueflow-search-result-icon">{MATCH_ICONS[r.matchField] ?? '?'}</span>
              <div className="ueflow-search-result-info">
                <span className="ueflow-search-result-title">{r.title}</span>
                <span className="ueflow-search-result-meta">
                  {r.graphName}{r.matchField !== 'title' ? ` \u2014 ${r.matchText}` : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && results.length === 0 && (
        <div className="ueflow-search-empty">No results</div>
      )}
    </div>
  );
};
