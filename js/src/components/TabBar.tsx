import type { FC } from 'react';
import { parseTabName } from '../hooks/useTabNavigation';

interface TabBarProps {
  openTabs: string[];
  activeGraph: string;
  onSelectGraph: (name: string) => void;
  onCloseTab: (name: string) => void;
  pinnedTab: string;
  comparison?: Record<string, { before: number; after: number }>;
}

const TAB_ICONS: Record<string, string> = {
  datatable: 'T',
  struct: 'S',
};

export const TabBar: FC<TabBarProps> = ({ openTabs, activeGraph, onSelectGraph, onCloseTab, pinnedTab, comparison }) => {
  return (
    <div className="ueflow-tab-bar" role="tablist">
      {openTabs.map((name) => {
        const isActive = name === activeGraph;
        const isPinned = name === pinnedTab;
        const comp = comparison?.[name];
        const tabInfo = parseTabName(name);
        const icon = TAB_ICONS[tabInfo.type];
        return (
          <div
            key={name}
            role="tab"
            tabIndex={0}
            aria-selected={isActive}
            className={`ueflow-tab ${isActive ? 'ueflow-tab--active' : ''}`}
            onClick={() => onSelectGraph(name)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectGraph(name); } }}
          >
            {icon && <span className={`ueflow-icon ueflow-icon--${tabInfo.type === 'datatable' ? 'table' : 'struct'}`} style={{ width: 16, height: 16, fontSize: 9 }}>{icon}</span>}
            <span className="ueflow-tab-name">{tabInfo.name}</span>
            {comp && (
              <span className="ueflow-tab-count">
                {comp.after ?? '?'}
              </span>
            )}
            {!isPinned && (
              <button
                className="ueflow-tab-close"
                aria-label={`Close ${name}`}
                onClick={(e) => { e.stopPropagation(); onCloseTab(name); }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
