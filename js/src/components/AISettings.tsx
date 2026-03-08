import { useState, useCallback, useRef, useEffect, type FC } from 'react';
import { useAIProvider } from '../contexts/AIProviderContext';
import { DEFAULT_MODEL, MODEL_OPTIONS } from '../utils/openrouter';

export const AISettings: FC = () => {
  const { ready, openRouterConfig, setOpenRouterKey, clearOpenRouterKey, remember } = useAIProvider();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [rem, setRem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync form state when popover opens
  useEffect(() => {
    if (open) {
      setKey(openRouterConfig?.apiKey ?? '');
      setModel(openRouterConfig?.model ?? DEFAULT_MODEL);
      setRem(remember);
      setError(null);
    }
  }, [open, openRouterConfig, remember]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSave = useCallback(() => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError('API key is required');
      return;
    }
    if (!trimmed.startsWith('sk-')) {
      setError('OpenRouter keys start with "sk-"');
      return;
    }
    setOpenRouterKey(trimmed, model.trim() || DEFAULT_MODEL, rem);
    setError(null);
    setOpen(false);
  }, [key, model, rem, setOpenRouterKey]);

  const handleClear = useCallback(() => {
    clearOpenRouterKey();
    setKey('');
    setModel(DEFAULT_MODEL);
    setRem(false);
    setError(null);
    setOpen(false);
  }, [clearOpenRouterKey]);

  return (
    <div className="ueflow-ai-settings" ref={popoverRef}>
      <button
        className={`ueflow-ai-toolbar-btn ueflow-ai-settings-btn${ready ? ' ueflow-ai-settings-btn--active' : ''}`}
        onClick={() => setOpen(!open)}
        title="AI Settings"
      >
        &#9881;{ready ? ' OpenRouter' : ' AI Settings'}
      </button>

      {open && (
        <div className="ueflow-ai-settings-popover">
          <div className="ueflow-ai-settings-title">
            AI Settings
          </div>

          <div className="ueflow-ai-settings-status">
            {ready ? (
              <span className="ueflow-ai-settings-badge ueflow-ai-settings-badge--active">
                Connected
              </span>
            ) : (
              <span className="ueflow-ai-settings-badge">
                No API key set
              </span>
            )}
          </div>

          {!ready && (
            <div className="ueflow-ai-settings-hint">
              Get a free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--uf-accent)' }}>openrouter.ai/keys</a> — many models are free.
            </div>
          )}

          <label className="ueflow-ai-settings-label">
            OpenRouter API Key
            <input
              className="ueflow-ai-settings-input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-..."
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className="ueflow-ai-settings-label">
            Model
            <select
              className="ueflow-ai-settings-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <optgroup label="Free (no cost)">
                {MODEL_OPTIONS.filter(m => m.tier === 'free').map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </optgroup>
              <optgroup label="Budget (under $1/M tokens)">
                {MODEL_OPTIONS.filter(m => m.tier === 'budget').map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </optgroup>
              <optgroup label="Standard">
                {MODEL_OPTIONS.filter(m => m.tier === 'standard').map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </optgroup>
              <optgroup label="Premium (best quality)">
                {MODEL_OPTIONS.filter(m => m.tier === 'premium').map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </optgroup>
            </select>
          </label>

          <label className="ueflow-ai-settings-checkbox">
            <input
              type="checkbox"
              checked={rem}
              onChange={(e) => setRem(e.target.checked)}
            />
            Remember across sessions
            <span className="ueflow-ai-settings-hint">
              (stores key in localStorage)
            </span>
          </label>

          {error && <div className="ueflow-ai-settings-error">{error}</div>}

          <div className="ueflow-ai-settings-footer">
            <button className="ueflow-ai-settings-save-btn" onClick={handleSave}>
              Save
            </button>
            {ready && (
              <button className="ueflow-ai-settings-clear-btn" onClick={handleClear}>
                Clear Key
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
