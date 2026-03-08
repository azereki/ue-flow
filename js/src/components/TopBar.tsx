import type { FC } from 'react';

interface TopBarProps {
  title: string;
  graphCount: number;
  functionCount: number;
  variableCount: number;
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

export const TopBar: FC<TopBarProps> = ({ title, graphCount, functionCount, variableCount, onToggleChat, chatOpen }) => {
  return (
    <header className="ueflow-topbar">
      <span className="ueflow-topbar-title">{title}</span>
      <span className="ueflow-topbar-stats">
        {graphCount} graphs | {functionCount} functions | {variableCount} variables
        {onToggleChat && (
          <button
            className={`ueflow-topbar-chat-btn${chatOpen ? ' ueflow-topbar-chat-btn--active' : ''}`}
            onClick={onToggleChat}
            title={chatOpen ? 'Close AI Chat' : 'Open AI Chat'}
          >
            &#9993;
          </button>
        )}
      </span>
    </header>
  );
};
