import { useEffect, useCallback, type FC } from 'react';

interface AIResultModalProps {
  title: string;
  loading: boolean;
  result: string | null;
  error: string | null;
  onClose: () => void;
}

export const AIResultModal: FC<AIResultModalProps> = ({ title, loading, result, error, onClose }) => {
  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="ueflow-ai-modal-overlay" onClick={onClose}>
      <div className="ueflow-ai-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="ueflow-ai-modal-header">
          <span className="ueflow-ai-modal-title">{title}</span>
          <button className="ueflow-chat-close-btn" onClick={onClose} title="Close">&#10005;</button>
        </div>
        <div className="ueflow-ai-modal-body">
          {loading && (
            <div className="ueflow-ai-modal-loading">
              <div className="ueflow-chat-thinking">
                <span className="ueflow-chat-thinking-dot" />
                <span className="ueflow-chat-thinking-dot" />
                <span className="ueflow-chat-thinking-dot" />
              </div>
              <div className="ueflow-ai-modal-loading-text">Analyzing blueprint...</div>
            </div>
          )}
          {error && <div className="ueflow-chat-error">{error}</div>}
          {result && <div className="ueflow-ai-modal-result">{result}</div>}
        </div>
      </div>
    </div>
  );
};
