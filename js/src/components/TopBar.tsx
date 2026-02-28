import type { FC } from 'react';

interface TopBarProps {
  title: string;
  graphCount: number;
  functionCount: number;
  variableCount: number;
}

export const TopBar: FC<TopBarProps> = ({ title, graphCount, functionCount, variableCount }) => {
  return (
    <div className="ueflow-topbar">
      <span className="ueflow-topbar-title">{title}</span>
      <span className="ueflow-topbar-stats">
        {graphCount} graphs | {functionCount} functions | {variableCount} variables
      </span>
    </div>
  );
};
