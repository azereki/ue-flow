import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a UE Blueprint analyst. You directly answer questions about Unreal Engine Blueprint graphs based on the provided context. Never ask clarifying questions — always give your best answer using the graph data you have. Be specific: reference node titles, pin names, and connection paths. Use UE terminology. Keep answers concise but substantive.`;

const MAX_HISTORY = 10;
const MODEL = 'claude-sonnet-4-5';

/** Extract text from a Puter.js stream chunk — handles varying response shapes. */
function extractChunkText(part: unknown): string {
  if (!part || typeof part !== 'object') return '';
  const p = part as Record<string, unknown>;
  // part.text (documented)
  if (typeof p.text === 'string') return p.text;
  // part.message?.content (some models return full message objects)
  if (p.message && typeof p.message === 'object') {
    const msg = p.message as Record<string, unknown>;
    if (typeof msg.content === 'string') return msg.content;
  }
  // part.delta?.content (OpenAI-style streaming)
  if (p.delta && typeof p.delta === 'object') {
    const delta = p.delta as Record<string, unknown>;
    if (typeof delta.content === 'string') return delta.content;
  }
  // part.content (direct)
  if (typeof p.content === 'string') return p.content;
  return '';
}

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
      const systemMessage: PuterAIChatMessage = {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nHere is the Blueprint context:\n${graphContext}`,
      };

      // Get current messages including the new user message
      const history: PuterAIChatMessage[] = [];
      setMessages((prev) => {
        for (const msg of prev) {
          history.push({ role: msg.role, content: msg.content });
        }
        return prev;
      });

      const apiMessages = [systemMessage, ...history];

      // Try streaming first
      let accumulated = '';
      let useStreaming = true;

      try {
        const stream = await puter.ai.chat(apiMessages, {
          model: MODEL,
          stream: true,
        });

        // Check if we actually got an async iterable
        if (stream && typeof stream === 'object' && Symbol.asyncIterator in stream) {
          setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

          for await (const part of stream) {
            const text = extractChunkText(part);
            if (text) {
              accumulated += text;
              const current = accumulated;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: current };
                return updated;
              });
            }
          }
        } else {
          // Got a non-streaming response back despite requesting stream
          useStreaming = false;
          const resp = stream as unknown as Record<string, unknown>;
          if (resp.message && typeof resp.message === 'object') {
            const msg = resp.message as Record<string, unknown>;
            accumulated = typeof msg.content === 'string' ? msg.content : '';
          } else if (typeof resp.text === 'string') {
            accumulated = resp.text;
          }
          if (accumulated) {
            setMessages((prev) => [...prev, { role: 'assistant', content: accumulated }]);
          }
        }
      } catch {
        // Streaming failed — fall back to non-streaming
        useStreaming = false;
        const response = await puter.ai.chat(apiMessages, { model: MODEL });
        const resp = response as PuterAIChatResponse;
        accumulated = resp.message?.content ?? '';
        if (accumulated) {
          setMessages((prev) => [...prev, { role: 'assistant', content: accumulated }]);
        }
      }

      if (!accumulated) {
        if (useStreaming) {
          // Empty assistant message was already added during streaming
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: '(No response received — try a different question)' };
            return updated;
          });
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: '(No response received — try a different question)' }]);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      if (message.includes('auth') || message.includes('sign in') || message.includes('login')) {
        setError('Sign in to Puter to use AI features');
      } else {
        setError(message);
      }
      // Remove empty trailing assistant message if present
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
