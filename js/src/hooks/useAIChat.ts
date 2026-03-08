import { useState, useCallback, useRef } from 'react';
import { MODEL, TIMEOUT_MS, extractResponseText, withTimeout } from '../utils/puter-helpers';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a UE Blueprint analyst. You directly answer questions about Unreal Engine Blueprint graphs based on the provided context. Never ask clarifying questions — always give your best answer using the graph data you have. Be specific: reference node titles, pin names, and connection paths. Use UE terminology. Keep answers concise but substantive.`;

const MAX_HISTORY = 10;

export function useAIChat(graphContext: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || streamingRef.current) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: userMessage.trim() };

    const updatedMessages = [...messagesRef.current, userMsg].slice(-MAX_HISTORY);
    messagesRef.current = updatedMessages;
    setMessages(updatedMessages);

    setIsStreaming(true);
    streamingRef.current = true;

    try {
      const apiMessages: PuterAIChatMessage[] = [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nHere is the Blueprint context:\n${graphContext}`,
        },
        ...messagesRef.current.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ];

      // Use non-streaming for reliability — wrap with timeout to catch auth hangs
      const response = await withTimeout(
        puter.ai.chat(apiMessages, { model: MODEL }),
        TIMEOUT_MS,
        'AI chat',
      );

      const text = extractResponseText(response);
      if (text) {
        const updated = [...messagesRef.current, { role: 'assistant' as const, content: text }];
        messagesRef.current = updated;
        setMessages(updated);
      } else {
        console.error('[ue-flow AI] Empty response:', JSON.stringify(response).slice(0, 500));
        const fallback = `(Empty response from model. Raw: ${JSON.stringify(response).slice(0, 200)})`;
        const updated = [...messagesRef.current, { role: 'assistant' as const, content: fallback }];
        messagesRef.current = updated;
        setMessages(updated);
      }
    } catch (err: unknown) {
      console.error('[ue-flow AI] Error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      // Remove empty trailing assistant message if present
      const cleaned = messagesRef.current.filter(
        (m, i) => !(i === messagesRef.current.length - 1 && m.role === 'assistant' && m.content === ''),
      );
      messagesRef.current = cleaned;
      setMessages(cleaned);
    } finally {
      setIsStreaming(false);
      streamingRef.current = false;
    }
  }, [graphContext]);

  const clearChat = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, clearChat };
}
