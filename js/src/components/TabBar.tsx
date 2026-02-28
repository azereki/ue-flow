import type { FC } from 'react';

interface TabBarProps {
  openTabs: string[];
  activeGraph: string;
  onSelectGraph: (name: string) => void;
  onCloseTab: (name: string) => void;
  pinnedTab: string;
  comparison?: Record<string, { before: number; after: number }>;
}

export const TabBar: FC<TabBarProps> = ({ openTabs, activeGraph, onSelectGraph, onCloseTab, pinnedTab, comparison }) => {
  return (
    <div className="ueflow-tab-bar" role="tablist">
      {openTabs.map((name) => {
        const isActive = name === activeGraph;
        const isPinned = name === pinnedTab;
        const comp = comparison?.[name];
        return (
          <button
            key={name}
            role="tab"
            aria-selected={isActive}
            className={`ueflow-tab ${isActive ? 'ueflow-tab--active' : ''}`}
            onClick={() => onSelectGraph(name)}
          >
            <span className="ueflow-tab-name">{name}</span>
            {comp && (
              <span className="ueflow-tab-count">
                {comp.after ?? '?'}
              </span>
            )}
            {!isPinned && (
              <span
                className="ueflow-tab-close"
                role="button"
                aria-label={`Close ${name}`}
                onClick={(e) => { e.stopPropagation(); onCloseTab(name); }}
              >
                ×
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
