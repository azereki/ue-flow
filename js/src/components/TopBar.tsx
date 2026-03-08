import type { FC } from 'react';
import { AIToolbar } from './AIToolbar';

interface TopBarProps {
  title: string;
  onToggleChat?: () => void;
  chatOpen?: boolean;
  graphContext?: string;
  onNavigateToNode?: (graphName: string, nodeTitle: string) => void;
  nodeTitles?: string[];
}

export const TopBar: FC<TopBarProps> = ({ title, onToggleChat, chatOpen, graphContext, onNavigateToNode, nodeTitles }) => {
  return (
    <header className="ueflow-topbar">
      <span className="ueflow-topbar-title">{title}</span>
      <div className="ueflow-topbar-right">
        {graphContext && (
          <AIToolbar graphContext={graphContext} onNavigateToNode={onNavigateToNode} nodeTitles={nodeTitles} />
        )}
        {onToggleChat && (
          <button
            className={`ueflow-topbar-chat-btn${chatOpen ? ' ueflow-topbar-chat-btn--active' : ''}`}
            onClick={onToggleChat}
            title={chatOpen ? 'Close AI Chat' : 'Open AI Chat'}
          >
            &#129302; Chat
          </button>
        )}
      </div>
    </header>
  );
};
