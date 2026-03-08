import { useState, useRef, useEffect, useCallback, type FC, type KeyboardEvent } from 'react';
import { useAIChat } from '../hooks/useAIChat';

interface ChatPanelProps {
  graphContext: string;
  onClose: () => void;
  floating?: boolean;
}

const SUGGESTED_PROMPTS = [
  'What does this graph do?',
  'List all events',
  'Explain the execution flow',
];

export const ChatPanel: FC<ChatPanelProps> = ({ graphContext, onClose, floating }) => {
  const { messages, isStreaming, error, sendMessage, clearChat } = useAIChat(graphContext);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages or when streaming starts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleChipClick = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const panelClass = `ueflow-chat-panel${floating ? ' ueflow-chat-panel--floating' : ''}`;

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className="ueflow-chat-header">
        <span className="ueflow-chat-header-title">
          AI Chat
          {isStreaming && <span className="ueflow-chat-header-status"> — thinking...</span>}
        </span>
        <div className="ueflow-chat-header-actions">
          {messages.length > 0 && !isStreaming && (
            <button className="ueflow-chat-clear-btn" onClick={clearChat} title="Clear chat">
              &#8635;
            </button>
          )}
          <button className="ueflow-chat-close-btn" onClick={onClose} title="Close chat">
            &#10005;
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ueflow-chat-messages">
        {messages.length === 0 && !error && !isStreaming && (
          <div className="ueflow-chat-empty">
            <div className="ueflow-chat-empty-title">Ask about this Blueprint</div>
            <div className="ueflow-chat-empty-hint">
              Powered by Puter.js — a free Puter account is needed.
              Allow popups when prompted.
            </div>
            <div className="ueflow-chat-chips">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="ueflow-chat-chip"
                  onClick={() => handleChipClick(prompt)}
                  disabled={isStreaming}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`ueflow-chat-bubble ueflow-chat-bubble--${msg.role}`}>
            <div className="ueflow-chat-bubble-content">
              {msg.content}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isStreaming && (
          <div className="ueflow-chat-bubble ueflow-chat-bubble--assistant">
            <div className="ueflow-chat-thinking">
              <span className="ueflow-chat-thinking-dot" />
              <span className="ueflow-chat-thinking-dot" />
              <span className="ueflow-chat-thinking-dot" />
            </div>
          </div>
        )}

        {error && (
          <div className="ueflow-chat-error">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ueflow-chat-input-area">
        <textarea
          ref={textareaRef}
          className="ueflow-chat-textarea"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Waiting for response...' : 'Ask about this Blueprint...'}
          rows={1}
          disabled={isStreaming}
        />
        <button
          className="ueflow-chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          title="Send message"
        >
          {isStreaming ? (
            <span className="ueflow-chat-send-spinner" />
          ) : (
            <>&#9654;</>
          )}
        </button>
      </div>
    </div>
  );
};
