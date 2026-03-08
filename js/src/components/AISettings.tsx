import { useState, useCallback, useRef, useEffect, type FC } from 'react';
import { useAIProvider, type AIProviderType } from '../contexts/AIProviderContext';
import { DEFAULT_MODEL, MODEL_OPTIONS } from '../utils/openrouter';
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from '../utils/gemini';

export const AISettings: FC = () => {
  const {
    ready, warning, activeProvider,
    openRouterConfig, geminiConfig,
    setOpenRouterKey, clearOpenRouterKey,
    setGeminiKey, clearGeminiKey,
    remember,
  } = useAIProvider();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AIProviderType>('gemini');
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Gemini form state
  const [gemKey, setGemKey] = useState('');
  const [gemModel, setGemModel] = useState(DEFAULT_GEMINI_MODEL);
  const [gemRem, setGemRem] = useState(false);

  // OpenRouter form state
  const [orKey, setOrKey] = useState('');
  const [orModel, setOrModel] = useState(DEFAULT_MODEL);
  const [orRem, setOrRem] = useState(false);

  // Sync form state when popover opens
  useEffect(() => {
    if (open) {
      setGemKey(geminiConfig?.apiKey ?? '');
      setGemModel(geminiConfig?.model ?? DEFAULT_GEMINI_MODEL);
      setOrKey(openRouterConfig?.apiKey ?? '');
      setOrModel(openRouterConfig?.model ?? DEFAULT_MODEL);
      setGemRem(!!geminiConfig && remember && activeProvider === 'gemini');
      setOrRem(!!openRouterConfig && remember && activeProvider === 'openrouter');
      setTab(activeProvider ?? 'gemini');
      setError(null);
    }
  }, [open, geminiConfig, openRouterConfig, remember, activeProvider]);

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

  const handleSaveGemini = useCallback(() => {
    const trimmed = gemKey.trim();
    if (!trimmed) {
      setError('API key is required');
      return;
    }
    setGeminiKey(trimmed, gemModel.trim() || DEFAULT_GEMINI_MODEL, gemRem);
    setError(null);
    setOpen(false);
  }, [gemKey, gemModel, gemRem, setGeminiKey]);

  const handleClearGemini = useCallback(() => {
    clearGeminiKey();
    setGemKey('');
    setGemModel(DEFAULT_GEMINI_MODEL);
    setGemRem(false);
    setError(null);
    setOpen(false);
  }, [clearGeminiKey]);

  const handleSaveOpenRouter = useCallback(() => {
    const trimmed = orKey.trim();
    if (!trimmed) {
      setError('API key is required');
      return;
    }
    if (!trimmed.startsWith('sk-')) {
      setError('OpenRouter keys start with "sk-"');
      return;
    }
    setOpenRouterKey(trimmed, orModel.trim() || DEFAULT_MODEL, orRem);
    setError(null);
    setOpen(false);
  }, [orKey, orModel, orRem, setOpenRouterKey]);

  const handleClearOpenRouter = useCallback(() => {
    clearOpenRouterKey();
    setOrKey('');
    setOrModel(DEFAULT_MODEL);
    setOrRem(false);
    setError(null);
    setOpen(false);
  }, [clearOpenRouterKey]);

  const providerLabel = activeProvider === 'gemini' ? 'Gemini' : activeProvider === 'openrouter' ? 'OpenRouter' : null;

  return (
    <div className="ueflow-ai-settings" ref={popoverRef}>
      <button
        className={`ueflow-ai-toolbar-btn ueflow-ai-settings-btn${ready ? ' ueflow-ai-settings-btn--active' : ''}`}
        onClick={() => setOpen(!open)}
        title="AI Settings"
      >
        <span className={`ueflow-ai-status-dot${ready ? (warning ? ' ueflow-ai-status-dot--warning' : ' ueflow-ai-status-dot--connected') : ''}`} title={warning ?? undefined} />
        &#9881;<span className="ueflow-ai-toolbar-label">{providerLabel ? ` ${providerLabel}` : ' AI Settings'}</span>
      </button>

      {open && (
        <div className="ueflow-ai-settings-popover">
          <div className="ueflow-ai-settings-title">AI Settings</div>

          {/* Provider tabs */}
          <div className="ueflow-ai-settings-tabs">
            <button
              className={`ueflow-ai-settings-tab${tab === 'gemini' ? ' ueflow-ai-settings-tab--active' : ''}`}
              onClick={() => { setTab('gemini'); setError(null); }}
            >
              Gemini (free)
            </button>
            <button
              className={`ueflow-ai-settings-tab${tab === 'openrouter' ? ' ueflow-ai-settings-tab--active' : ''}`}
              onClick={() => { setTab('openrouter'); setError(null); }}
            >
              OpenRouter (BYOK)
            </button>
          </div>

          {/* Gemini tab */}
          {tab === 'gemini' && (
            <>
              <div className="ueflow-ai-settings-status">
                {activeProvider === 'gemini' ? (
                  <span className="ueflow-ai-settings-badge ueflow-ai-settings-badge--active">Active</span>
                ) : geminiConfig ? (
                  <span className="ueflow-ai-settings-badge ueflow-ai-settings-badge--inactive">Configured</span>
                ) : (
                  <span className="ueflow-ai-settings-badge">Not configured</span>
                )}
              </div>

              <div className="ueflow-ai-settings-hint">
                Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--uf-accent)' }}>aistudio.google.com</a> — no credit card required.
              </div>

              <label className="ueflow-ai-settings-label">
                Gemini API Key
                <input
                  className="ueflow-ai-settings-input"
                  type="password"
                  value={gemKey}
                  onChange={(e) => setGemKey(e.target.value)}
                  placeholder="AIza..."
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>

              <label className="ueflow-ai-settings-label">
                Model
                <select
                  className="ueflow-ai-settings-select"
                  value={gemModel}
                  onChange={(e) => setGemModel(e.target.value)}
                >
                  {GEMINI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </label>

              <label className="ueflow-ai-settings-checkbox">
                <input type="checkbox" checked={gemRem} onChange={(e) => setGemRem(e.target.checked)} />
                Remember across sessions
                <span className="ueflow-ai-settings-hint">(stores key in localStorage)</span>
              </label>

              {error && <div className="ueflow-ai-settings-error">{error}</div>}

              <div className="ueflow-ai-settings-footer">
                <button className="ueflow-ai-settings-save-btn" onClick={handleSaveGemini}>Save</button>
                {geminiConfig && (
                  <button className="ueflow-ai-settings-clear-btn" onClick={handleClearGemini}>Clear Key</button>
                )}
              </div>
            </>
          )}

          {/* OpenRouter tab */}
          {tab === 'openrouter' && (
            <>
              <div className="ueflow-ai-settings-status">
                {activeProvider === 'openrouter' ? (
                  <span className="ueflow-ai-settings-badge ueflow-ai-settings-badge--active">Active</span>
                ) : openRouterConfig ? (
                  <span className="ueflow-ai-settings-badge ueflow-ai-settings-badge--inactive">Configured</span>
                ) : (
                  <span className="ueflow-ai-settings-badge">Not configured</span>
                )}
              </div>

              <div className="ueflow-ai-settings-hint">
                Get a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--uf-accent)' }}>openrouter.ai/keys</a> — access any model with your own key.
              </div>

              <label className="ueflow-ai-settings-label">
                OpenRouter API Key
                <input
                  className="ueflow-ai-settings-input"
                  type="password"
                  value={orKey}
                  onChange={(e) => setOrKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>

              <label className="ueflow-ai-settings-label">
                Model
                <select
                  className="ueflow-ai-settings-select"
                  value={orModel}
                  onChange={(e) => setOrModel(e.target.value)}
                >
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
                <input type="checkbox" checked={orRem} onChange={(e) => setOrRem(e.target.checked)} />
                Remember across sessions
                <span className="ueflow-ai-settings-hint">(stores key in localStorage)</span>
              </label>

              {error && <div className="ueflow-ai-settings-error">{error}</div>}

              <div className="ueflow-ai-settings-footer">
                <button className="ueflow-ai-settings-save-btn" onClick={handleSaveOpenRouter}>Save</button>
                {openRouterConfig && (
                  <button className="ueflow-ai-settings-clear-btn" onClick={handleClearOpenRouter}>Clear Key</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
