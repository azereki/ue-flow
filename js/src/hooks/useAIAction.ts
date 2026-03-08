import { useState, useCallback, useRef } from 'react';
import { MODEL, extractResponseText, withTimeout } from '../utils/puter-helpers';

const ACTION_TIMEOUT_MS = 60_000;

export interface AIActionState {
  loading: boolean;
  result: string | null;
  error: string | null;
}

let nextRequestId = 0;

export function useAIAction() {
  const [state, setState] = useState<AIActionState>({ loading: false, result: null, error: null });
  const activeRequestRef = useRef(0);

  const execute = useCallback(async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
    const requestId = ++nextRequestId;
    activeRequestRef.current = requestId;
    setState({ loading: true, result: null, error: null });

    try {
      const messages: PuterAIChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await withTimeout(
        puter.ai.chat(messages, { model: MODEL }),
        ACTION_TIMEOUT_MS,
        'AI action',
      );

      // Stale response — a newer request superseded this one
      if (activeRequestRef.current !== requestId) return null;

      const text = extractResponseText(response);
      if (text) {
        setState({ loading: false, result: text, error: null });
        return text;
      } else {
        setState({ loading: false, result: null, error: 'No response received from AI.' });
        return null;
      }
    } catch (err: unknown) {
      // Only apply error if this is still the active request
      if (activeRequestRef.current !== requestId) return null;
      const message = err instanceof Error ? err.message : String(err);
      setState({ loading: false, result: null, error: message });
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    activeRequestRef.current = 0;
    setState({ loading: false, result: null, error: null });
  }, []);

  return { ...state, execute, clear };
}
