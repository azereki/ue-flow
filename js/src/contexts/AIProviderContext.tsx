import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  type ChatMessage,
  type OpenRouterConfig,
  openRouterChat,
  loadOpenRouterConfig,
  saveOpenRouterConfig,
  clearOpenRouterConfig,
  getRememberPreference,
  DEFAULT_MODEL,
} from '../utils/openrouter';
import {
  type GeminiConfig,
  geminiChat,
  loadGeminiConfig,
  saveGeminiConfig,
  clearGeminiConfig,
  getGeminiRememberPreference,
  DEFAULT_GEMINI_MODEL,
} from '../utils/gemini';

export type AIProviderType = 'gemini' | 'openrouter';

export interface AIProviderState {
  /** Whether any provider is configured and ready. */
  ready: boolean;
  /** Which provider is active ('gemini' or 'openrouter'), or null. */
  activeProvider: AIProviderType | null;
  /** Warning message from last failed API call (null = healthy). */
  warning: string | null;
  /** OpenRouter config if set. */
  openRouterConfig: OpenRouterConfig | null;
  /** Gemini config if set. */
  geminiConfig: GeminiConfig | null;
  /** Send a chat completion via the active provider. Returns the assistant's text. */
  chatCompletion: (messages: ChatMessage[]) => Promise<string>;
  /** Save an OpenRouter key. */
  setOpenRouterKey: (apiKey: string, model: string, remember: boolean) => void;
  /** Clear the OpenRouter key. */
  clearOpenRouterKey: () => void;
  /** Save a Gemini key. */
  setGeminiKey: (apiKey: string, model: string, remember: boolean) => void;
  /** Clear the Gemini key. */
  clearGeminiKey: () => void;
  /** Whether the remember-across-sessions preference is on (for active provider). */
  remember: boolean;
}

const AIProviderContext = createContext<AIProviderState | null>(null);

// Which provider was last actively used
const ACTIVE_PROVIDER_KEY = 'uf-active-provider';

function loadActiveProvider(): AIProviderType | null {
  return (localStorage.getItem(ACTIVE_PROVIDER_KEY) ?? sessionStorage.getItem(ACTIVE_PROVIDER_KEY)) as AIProviderType | null;
}

function saveActiveProvider(provider: AIProviderType): void {
  localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
}

export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [orConfig, setOrConfig] = useState<OpenRouterConfig | null>(() => loadOpenRouterConfig());
  const [geminiConfig, setGeminiConfigState] = useState<GeminiConfig | null>(() => loadGeminiConfig());
  const [activeProvider, setActiveProvider] = useState<AIProviderType | null>(() => {
    const saved = loadActiveProvider();
    // Validate saved preference against what's actually configured
    if (saved === 'openrouter' && loadOpenRouterConfig()) return 'openrouter';
    if (saved === 'gemini' && loadGeminiConfig()) return 'gemini';
    // Fallback: prefer whichever is configured
    if (loadGeminiConfig()) return 'gemini';
    if (loadOpenRouterConfig()) return 'openrouter';
    return null;
  });
  const [warning, setWarning] = useState<string | null>(null);

  const ready = activeProvider === 'gemini' ? !!geminiConfig : activeProvider === 'openrouter' ? !!orConfig : false;

  const remember = activeProvider === 'gemini' ? getGeminiRememberPreference() : getRememberPreference();

  const chatCompletion = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    if (activeProvider === 'gemini' && geminiConfig) {
      try {
        const result = await geminiChat(messages, geminiConfig);
        setWarning(null);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setWarning(msg);
        throw err;
      }
    }
    if (activeProvider === 'openrouter' && orConfig) {
      try {
        const result = await openRouterChat(messages, orConfig);
        setWarning(null);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setWarning(msg);
        throw err;
      }
    }
    throw new Error('No AI provider configured. Open AI Settings to add a Gemini or OpenRouter key.');
  }, [activeProvider, geminiConfig, orConfig]);

  const setOpenRouterKey = useCallback((apiKey: string, model: string, rem: boolean) => {
    saveOpenRouterConfig(apiKey, model, rem);
    setOrConfig({ apiKey, model: model || DEFAULT_MODEL });
    setActiveProvider('openrouter');
    saveActiveProvider('openrouter');
    setWarning(null);
  }, []);

  const clearOpenRouterKeyFn = useCallback(() => {
    clearOpenRouterConfig();
    setOrConfig(null);
    if (geminiConfig) {
      setActiveProvider('gemini');
      saveActiveProvider('gemini');
    } else {
      setActiveProvider(null);
    }
    setWarning(null);
  }, [geminiConfig]);

  const setGeminiKey = useCallback((apiKey: string, model: string, rem: boolean) => {
    saveGeminiConfig(apiKey, model, rem);
    setGeminiConfigState({ apiKey, model: model || DEFAULT_GEMINI_MODEL });
    setActiveProvider('gemini');
    saveActiveProvider('gemini');
    setWarning(null);
  }, []);

  const clearGeminiKeyFn = useCallback(() => {
    clearGeminiConfig();
    setGeminiConfigState(null);
    if (orConfig) {
      setActiveProvider('openrouter');
      saveActiveProvider('openrouter');
    } else {
      setActiveProvider(null);
    }
    setWarning(null);
  }, [orConfig]);

  // Sync if storage changes externally (e.g. another tab)
  useEffect(() => {
    const onStorage = () => {
      setOrConfig(loadOpenRouterConfig());
      setGeminiConfigState(loadGeminiConfig());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AIProviderContext.Provider value={{
      ready,
      activeProvider,
      warning,
      openRouterConfig: orConfig,
      geminiConfig,
      chatCompletion,
      setOpenRouterKey,
      clearOpenRouterKey: clearOpenRouterKeyFn,
      setGeminiKey,
      clearGeminiKey: clearGeminiKeyFn,
      remember,
    }}>
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAIProvider(): AIProviderState {
  const ctx = useContext(AIProviderContext);
  if (!ctx) throw new Error('useAIProvider must be used within AIProviderProvider');
  return ctx;
}
