import { useState, useCallback, useRef } from 'react';
import { MODEL, TIMEOUT_MS, extractResponseText, withTimeout } from '../utils/puter-helpers';

export interface AIActionState {
  loading: boolean;
  result: string | null;
  error: string | null;
}

export function useAIAction() {
  const [state, setState] = useState<AIActionState>({ loading: false, result: null, error: null });
  const abortRef = useRef(false);

  const execute = useCallback(async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
    abortRef.current = false;
    setState({ loading: true, result: null, error: null });

    try {
      const messages: PuterAIChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await withTimeout(
        puter.ai.chat(messages, { model: MODEL }),
        TIMEOUT_MS,
        'AI action',
      );

      if (abortRef.current) return null;

      const text = extractResponseText(response);
      if (text) {
        setState({ loading: false, result: text, error: null });
        return text;
      } else {
        setState({ loading: false, result: null, error: 'No response received from AI.' });
        return null;
      }
    } catch (err: unknown) {
      if (abortRef.current) return null;
      const message = err instanceof Error ? err.message : String(err);
      setState({ loading: false, result: null, error: message });
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    abortRef.current = true;
    setState({ loading: false, result: null, error: null });
  }, []);

  return { ...state, execute, clear };
}
