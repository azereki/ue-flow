import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a UE Blueprint analyst. You help users understand Unreal Engine Blueprint graphs. Answer questions concisely using UE terminology. When referencing nodes, use their exact titles.`;

const MAX_HISTORY = 10;
const MODEL = 'gpt-4.1-nano';

export function useAIChat(graphContext: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingRef = useRef(false);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || streamingRef.current) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: userMessage.trim() };

    setMessages((prev) => {
      const updated = [...prev, userMsg];
      return updated.slice(-MAX_HISTORY);
    });

    setIsStreaming(true);
    streamingRef.current = true;

    try {
      // Build message array for Puter.ai.chat
      const systemMessage: PuterAIChatMessage = {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nHere is the Blueprint context:\n${graphContext}`,
      };

      // Get current messages including the new user message
      const history: PuterAIChatMessage[] = [];
      // We need the current state — use a sync read via a resolved set
      setMessages((prev) => {
        for (const msg of prev) {
          history.push({ role: msg.role, content: msg.content });
        }
        return prev; // no change
      });

      const apiMessages = [systemMessage, ...history];

      const stream = await puter.ai.chat(apiMessages, {
        model: MODEL,
        stream: true,
      });

      let accumulated = '';
      // Add empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      for await (const part of stream) {
        if (part.text) {
          accumulated += part.text;
          const current = accumulated;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: current };
            return updated;
          });
        }
      }

      // If we got no content, set a fallback
      if (!accumulated) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: '(No response received)' };
          return updated;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      if (message.includes('auth') || message.includes('sign in') || message.includes('login')) {
        setError('Sign in to Puter to use AI features');
      } else {
        setError(message);
      }
      // Remove the empty assistant message if it was added
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
      streamingRef.current = false;
    }
  }, [graphContext]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, clearChat };
}
