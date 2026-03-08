import { useState, useCallback, useRef } from 'react';
import { useAIProvider } from '../contexts/AIProviderContext';
import type { ChatMessage } from '../utils/openrouter';

export interface AIActionState {
  loading: boolean;
  result: string | null;
  error: string | null;
}

let nextRequestId = 0;

export function useAIAction() {
  const { chatCompletion } = useAIProvider();
  const [state, setState] = useState<AIActionState>({ loading: false, result: null, error: null });
  const activeRequestRef = useRef(0);

  const execute = useCallback(async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
    const requestId = ++nextRequestId;
    activeRequestRef.current = requestId;
    setState({ loading: true, result: null, error: null });

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const text = await chatCompletion(messages);

      if (activeRequestRef.current !== requestId) return null;

      setState({ loading: false, result: text, error: null });
      return text;
    } catch (err: unknown) {
      if (activeRequestRef.current !== requestId) return null;
      const message = err instanceof Error ? err.message : String(err);
      setState({ loading: false, result: null, error: message });
      return null;
    }
  }, [chatCompletion]);

  const clear = useCallback(() => {
    activeRequestRef.current = 0;
    setState({ loading: false, result: null, error: null });
  }, []);

  return { ...state, execute, clear };
}
