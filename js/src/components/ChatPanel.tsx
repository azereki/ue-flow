import { useState, useRef, useEffect, useCallback, useMemo, type FC, type KeyboardEvent } from 'react';
import { useAIChat } from '../hooks/useAIChat';
import { useAIProvider } from '../contexts/AIProviderContext';
import { GeneratePreview } from './GeneratePreview';
import type { UEGraphJSON } from '../types/ue-graph';

interface ChatPanelProps {
  graphContext: string;
  onClose: () => void;
  floating?: boolean;
  selectedNodeTitle?: string | null;
  onAcceptGraph?: (graph: UEGraphJSON, mode: 'merge' | 'new') => void;
}

const STATIC_PROMPTS = [
  'What does this graph do?',
  'List all events',
  'Explain the execution flow',
];

const GENERATE_PROMPTS = [
  'Generate a health regen system',
  'Create a damage handler',
  'Build a simple timer',
];

const COMMAND_PROMPTS = [
  'Delete the Print String node',
  'Connect BeginPlay to Delay',
  'Set Duration to 3.0',
];

export const ChatPanel: FC<ChatPanelProps> = ({ graphContext, onClose, floating, selectedNodeTitle, onAcceptGraph }) => {
  const { ready } = useAIProvider();
  const { messages, isStreaming, error, sendMessage, clearChat, generatedGraph, clearGeneratedGraph, lastCommandResult } = useAIChat(graphContext, selectedNodeTitle);

  const suggestedPrompts = useMemo(() => {
    if (selectedNodeTitle) {
      return [
        `What does ${selectedNodeTitle} do?`,
        `What connects to ${selectedNodeTitle}?`,
        `Trace execution from ${selectedNodeTitle}`,
      ];
    }
    return [...STATIC_PROMPTS, ...GENERATE_PROMPTS, ...COMMAND_PROMPTS];
  }, [selectedNodeTitle]);
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

      {/* No API key prompt */}
      {!ready ? (
        <div className="ueflow-chat-messages">
          <div className="ueflow-chat-auth">
            <div className="ueflow-chat-auth-icon">&#129302;</div>
            <div className="ueflow-chat-auth-title">AI-Powered Blueprint Chat</div>
            <div className="ueflow-chat-auth-desc">
              Add a free Gemini API key or an OpenRouter key in AI Settings to get started.
            </div>
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
                  {suggestedPrompts.map((prompt) => (
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
              placeholder={isStreaming ? 'Waiting for response...' : 'Ask or generate a Blueprint...'}
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

      {/* Generate Preview Overlay */}
      {generatedGraph && (
        <GeneratePreview
          graph={generatedGraph}
          onAccept={(graph, mode) => {
            onAcceptGraph?.(graph, mode);
            clearGeneratedGraph();
          }}
          onDiscard={clearGeneratedGraph}
        />
      )}
    </div>
  );
};
