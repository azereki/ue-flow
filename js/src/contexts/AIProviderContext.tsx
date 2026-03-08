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

export interface AIProviderState {
  /** Whether an OpenRouter key is configured. */
  ready: boolean;
  /** OpenRouter config if set. */
  openRouterConfig: OpenRouterConfig | null;
  /** Send a chat completion via OpenRouter. Returns the assistant's text. */
  chatCompletion: (messages: ChatMessage[]) => Promise<string>;
  /** Save an OpenRouter key. */
  setOpenRouterKey: (apiKey: string, model: string, remember: boolean) => void;
  /** Clear the OpenRouter key. */
  clearOpenRouterKey: () => void;
  /** Whether the remember-across-sessions preference is on. */
  remember: boolean;
}

const AIProviderContext = createContext<AIProviderState | null>(null);

export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [orConfig, setOrConfig] = useState<OpenRouterConfig | null>(() => loadOpenRouterConfig());
  const [remember, setRemember] = useState(() => getRememberPreference());

  const ready = !!orConfig;

  const chatCompletion = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    if (!orConfig) {
      throw new Error('No API key configured. Open AI Settings and add your OpenRouter key.');
    }
    return openRouterChat(messages, orConfig);
  }, [orConfig]);

  const setOpenRouterKey = useCallback((apiKey: string, model: string, rem: boolean) => {
    saveOpenRouterConfig(apiKey, model, rem);
    setOrConfig({ apiKey, model: model || DEFAULT_MODEL });
    setRemember(rem);
  }, []);

  const clearOpenRouterKeyFn = useCallback(() => {
    clearOpenRouterConfig();
    setOrConfig(null);
    setRemember(false);
  }, []);

  // Sync if storage changes externally (e.g. another tab)
  useEffect(() => {
    const onStorage = () => {
      setOrConfig(loadOpenRouterConfig());
      setRemember(getRememberPreference());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AIProviderContext.Provider value={{
      ready,
      openRouterConfig: orConfig,
      chatCompletion,
      setOpenRouterKey,
      clearOpenRouterKey: clearOpenRouterKeyFn,
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
