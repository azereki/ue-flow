import { useRef, useCallback, type FC } from 'react';
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
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, name: string) => {
    const idx = openTabs.indexOf(name);
    let nextIdx = -1;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIdx = (idx + 1) % openTabs.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIdx = (idx - 1 + openTabs.length) % openTabs.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIdx = openTabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelectGraph(name);
        return;
      default:
        return;
    }

    if (nextIdx >= 0) {
      const nextTab = openTabs[nextIdx];
      onSelectGraph(nextTab);
      // Focus the newly activated tab element
      const tabs = tabListRef.current?.querySelectorAll<HTMLElement>('[role="tab"]');
      tabs?.[nextIdx]?.focus();
    }
  }, [openTabs, onSelectGraph]);

  return (
    <div ref={tabListRef} className="ueflow-tab-bar" role="tablist" aria-label="Open graphs">
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
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            aria-controls="ueflow-graph"
            className={`ueflow-tab ${isActive ? 'ueflow-tab--active' : ''}`}
            onClick={() => onSelectGraph(name)}
            onKeyDown={(e) => handleKeyDown(e, name)}
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
                tabIndex={-1}
                aria-label={`Close ${tabInfo.name} tab`}
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
