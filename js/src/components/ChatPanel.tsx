import { useState, useRef, useEffect, useCallback, type FC, type KeyboardEvent } from 'react';
import { useAIChat } from '../hooks/useAIChat';
import { useAIProvider } from '../contexts/AIProviderContext';
import { usePuterAuth } from '../hooks/usePuterAuth';

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
  const { provider } = useAIProvider();
  const { authState, authError, signIn } = usePuterAuth();
  const { messages, isStreaming, error, sendMessage, clearChat } = useAIChat(graphContext);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // OpenRouter users skip auth entirely
  const needsAuth = provider === 'puter' && authState !== 'signed-in';

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

      {/* Auth gate — only for Puter.js provider */}
      {needsAuth ? (
        <div className="ueflow-chat-messages">
          <div className="ueflow-chat-auth">
            <div className="ueflow-chat-auth-icon">&#129302;</div>
            <div className="ueflow-chat-auth-title">AI-Powered Blueprint Chat</div>
            <div className="ueflow-chat-auth-desc">
              {authState === 'checking'
                ? 'Checking connection...'
                : authState === 'unavailable'
                  ? 'Puter.js is not available. Set an OpenRouter API key in AI Settings for instant access.'
                  : 'Connect a free Puter account to chat, or set an OpenRouter API key in AI Settings for instant access.'}
            </div>
            {(authState === 'signed-out' || authState === 'error') && (
              <button className="ueflow-chat-auth-btn" onClick={signIn}>
                Connect to Puter (free)
              </button>
            )}
            {authState === 'signing-in' && (
              <button className="ueflow-chat-auth-btn ueflow-chat-auth-btn--loading" disabled>
                <span className="ueflow-chat-send-spinner" />
                Connecting...
              </button>
            )}
            {authState === 'checking' && (
              <div className="ueflow-chat-thinking">
                <span className="ueflow-chat-thinking-dot" />
                <span className="ueflow-chat-thinking-dot" />
                <span className="ueflow-chat-thinking-dot" />
              </div>
            )}
            {authError && (
              <div className="ueflow-chat-error">{authError}</div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="ueflow-chat-messages">
            {messages.length === 0 && !error && !isStreaming && (
              <div className="ueflow-chat-empty">
                <div className="ueflow-chat-empty-title">Ask about this Blueprint</div>
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
        </>
      )}
    </div>
  );
};
