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
import { extractResponseText, withTimeout, isPuterAvailable } from '../utils/puter-helpers';

export type AIProvider = 'puter' | 'openrouter';
export type PuterAuthState = 'checking' | 'unavailable' | 'signed-out' | 'signing-in' | 'signed-in' | 'error';

export interface AIProviderState {
  /** Active provider. */
  provider: AIProvider;
  /** Whether the active provider is ready (authed / key set). */
  ready: boolean;
  /** OpenRouter config if set. */
  openRouterConfig: OpenRouterConfig | null;
  /** Send a chat completion. Returns the assistant's text. */
  chatCompletion: (messages: ChatMessage[]) => Promise<string>;
  /** Save an OpenRouter key. */
  setOpenRouterKey: (apiKey: string, model: string, remember: boolean) => void;
  /** Clear the OpenRouter key and fall back to Puter. */
  clearOpenRouterKey: () => void;
  /** Get the remember preference. */
  remember: boolean;
  /** Shared Puter auth state (avoids multiple independent usePuterAuth instances). */
  puterAuthState: PuterAuthState;
  /** Puter auth error message. */
  puterAuthError: string | null;
  /** Trigger Puter sign-in (shared across all consumers). */
  puterSignIn: () => Promise<void>;
}

const AIProviderContext = createContext<AIProviderState | null>(null);

const PUTER_MODEL = 'claude-sonnet-4-6';
const TIMEOUT_MS = 60_000;

export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [orConfig, setOrConfig] = useState<OpenRouterConfig | null>(() => loadOpenRouterConfig());
  const [remember, setRemember] = useState(() => getRememberPreference());
  const [puterAuthState, setPuterAuthState] = useState<PuterAuthState>('checking');
  const [puterAuthError, setPuterAuthError] = useState<string | null>(null);

  // Shared Puter auth check — runs once on mount
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;
    const check = () => {
      if (isPuterAvailable()) {
        try {
          setPuterAuthState(puter.auth.isSignedIn() ? 'signed-in' : 'signed-out');
        } catch {
          setPuterAuthState('signed-out');
        }
        return;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        setPuterAuthState('unavailable');
        return;
      }
      setTimeout(check, 100);
    };
    check();
  }, []);

  const puterSignIn = useCallback(async () => {
    setPuterAuthState('signing-in');
    setPuterAuthError(null);
    try {
      await puter.auth.signIn();
      setPuterAuthState('signed-in');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPuterAuthError(message);
      setPuterAuthState('error');
    }
  }, []);

  // Determine active provider
  const provider: AIProvider = orConfig ? 'openrouter' : 'puter';
  const ready = orConfig ? true : isPuterAvailable();

  const chatCompletion = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    if (orConfig) {
      return openRouterChat(messages, orConfig);
    }

    // Puter.js fallback
    const apiMessages: PuterAIChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await withTimeout(
      puter.ai.chat(apiMessages, { model: PUTER_MODEL }),
      TIMEOUT_MS,
      'AI chat',
    );

    const text = extractResponseText(response);
    if (!text) throw new Error('Empty response from Puter.js');
    return text;
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
      provider,
      ready,
      openRouterConfig: orConfig,
      chatCompletion,
      setOpenRouterKey,
      clearOpenRouterKey: clearOpenRouterKeyFn,
      remember,
      puterAuthState,
      puterAuthError,
      puterSignIn,
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
