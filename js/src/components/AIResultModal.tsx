import { useEffect, useCallback, useRef, useState, type FC } from 'react';

interface AIResultModalProps {
  title: string;
  loading: boolean;
  result: string | null;
  error: string | null;
  onClose: () => void;
}

export const AIResultModal: FC<AIResultModalProps> = ({ title, loading, result, error, onClose }) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    // Ctrl+A / Cmd+A — select only modal body text
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      if (bodyRef.current) {
        e.preventDefault();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(bodyRef.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = result;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleExportMarkdown = useCallback(() => {
    if (!result) return;
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filename = `${slug}.md`;
    const blob = new Blob([`# ${title}\n\n${result}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, title]);

  return (
    <div className="ueflow-ai-modal-overlay">
      <div className="ueflow-ai-modal-card">
        <div className="ueflow-ai-modal-header">
          <span className="ueflow-ai-modal-title">{title}</span>
          <div className="ueflow-ai-modal-actions">
            {result && (
              <>
                <button
                  className="ueflow-ai-modal-action-btn"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  {copied ? <>{'\u2713'} Copied</> : <>{'\uD83D\uDCCB'} Copy</>}
                </button>
                <button
                  className="ueflow-ai-modal-action-btn"
                  onClick={handleExportMarkdown}
                  title="Export as Markdown"
                >
                  &#128190; Export .md
                </button>
              </>
            )}
            <button className="ueflow-chat-close-btn" onClick={onClose} title="Close">&#10005;</button>
          </div>
        </div>
        <div className="ueflow-ai-modal-body" ref={bodyRef}>
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
