import { useCallback, type FC } from 'react';

interface TabBarProps {
  graphNames: string[];
  activeGraph: string;
  onSelectGraph: (name: string) => void;
  comparison?: Record<string, { before: number; after: number }>;
}

export const TabBar: FC<TabBarProps> = ({ graphNames, activeGraph, onSelectGraph, comparison }) => {
  if (graphNames.length <= 1) return null;

  return (
    <div className="ueflow-tab-bar">
      {graphNames.map((name) => {
        const isActive = name === activeGraph;
        const comp = comparison?.[name];
        return (
          <button
            key={name}
            className={`ueflow-tab ${isActive ? 'ueflow-tab--active' : ''}`}
            onClick={() => onSelectGraph(name)}
          >
            <span className="ueflow-tab-name">{name}</span>
            {comp && (
              <span className="ueflow-tab-count">
                {comp.after ?? '?'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
