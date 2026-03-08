import type { FC } from 'react';
import { AIToolbar } from './AIToolbar';

interface TopBarProps {
  title: string;
  graphCount: number;
  functionCount: number;
  variableCount: number;
  onToggleChat?: () => void;
  chatOpen?: boolean;
  graphContext?: string;
  onNavigateToNode?: (graphName: string, nodeTitle: string) => void;
}

export const TopBar: FC<TopBarProps> = ({ title, graphCount, functionCount, variableCount, onToggleChat, chatOpen, graphContext, onNavigateToNode }) => {
  return (
    <header className="ueflow-topbar">
      <span className="ueflow-topbar-title">{title}</span>
      <div className="ueflow-topbar-right">
        {graphContext && (
          <AIToolbar graphContext={graphContext} onNavigateToNode={onNavigateToNode} />
        )}
        <span className="ueflow-topbar-stats">
          {graphCount} graphs | {functionCount} functions | {variableCount} variables
          {onToggleChat && (
            <button
              className={`ueflow-topbar-chat-btn${chatOpen ? ' ueflow-topbar-chat-btn--active' : ''}`}
              onClick={onToggleChat}
              title={chatOpen ? 'Close AI Chat' : 'Open AI Chat'}
            >
              &#129302;
            </button>
          )}
        </span>
      </div>
    </header>
  );
};
