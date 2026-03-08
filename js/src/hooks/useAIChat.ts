import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a UE Blueprint analyst. You directly answer questions about Unreal Engine Blueprint graphs based on the provided context. Never ask clarifying questions — always give your best answer using the graph data you have. Be specific: reference node titles, pin names, and connection paths. Use UE terminology. Keep answers concise but substantive.`;

const MAX_HISTORY = 10;
const MODEL = 'claude-sonnet-4-6';

/** Extract text from a non-streaming Puter.js response (handles both string and Claude array content). */
function extractResponseText(resp: unknown): string {
  if (!resp || typeof resp !== 'object') return '';
  const r = resp as Record<string, unknown>;
  const msg = r.message as Record<string, unknown> | undefined;
  if (!msg) return typeof r.text === 'string' ? r.text : '';
  const content = msg.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c: unknown) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && 'text' in c) return (c as Record<string, unknown>).text;
        return '';
      })
      .join('');
  }
  return '';
}

/** Extract text from a Puter.js stream chunk. */
function extractChunkText(part: unknown): string {
  if (!part || typeof part !== 'object') return '';
  const p = part as Record<string, unknown>;
  if (typeof p.text === 'string') return p.text;
  if (p.message && typeof p.message === 'object') {
    const msg = p.message as Record<string, unknown>;
    if (typeof msg.content === 'string') return msg.content;
  }
  if (p.delta && typeof p.delta === 'object') {
    const delta = p.delta as Record<string, unknown>;
    if (typeof delta.content === 'string') return delta.content;
  }
  if (typeof p.content === 'string') return p.content;
  return '';
}

export function useAIChat(graphContext: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingRef = useRef(false);
  // Keep a ref-copy of messages so we can read current state synchronously
  const messagesRef = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || streamingRef.current) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: userMessage.trim() };

    // Update both state and ref
    const updatedMessages = [...messagesRef.current, userMsg].slice(-MAX_HISTORY);
    messagesRef.current = updatedMessages;
    setMessages(updatedMessages);

    setIsStreaming(true);
    streamingRef.current = true;

    try {
      // Build API messages from ref (guaranteed up-to-date)
      const apiMessages: PuterAIChatMessage[] = [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nHere is the Blueprint context:\n${graphContext}`,
        },
        ...messagesRef.current.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ];

      console.log('[ue-flow AI] Sending to Puter.ai.chat:', { model: MODEL, messageCount: apiMessages.length, systemPromptLength: apiMessages[0].content.length });

      // Try streaming
      let accumulated = '';

      const streamResult = await puter.ai.chat(apiMessages, {
        model: MODEL,
        stream: true,
      });

      console.log('[ue-flow AI] Got response:', typeof streamResult, streamResult);

      // Check if async iterable (streaming)
      if (streamResult && typeof streamResult === 'object' && Symbol.asyncIterator in streamResult) {
        // Add placeholder assistant message
        const withPlaceholder = [...messagesRef.current, { role: 'assistant' as const, content: '' }];
        messagesRef.current = withPlaceholder;
        setMessages(withPlaceholder);

        let chunkCount = 0;
        for await (const part of streamResult) {
          chunkCount++;
          if (chunkCount <= 3) {
            console.log('[ue-flow AI] Stream chunk', chunkCount, ':', JSON.stringify(part).slice(0, 200));
          }
          const text = extractChunkText(part);
          if (text) {
            accumulated += text;
            const current = accumulated;
            const updated = [...messagesRef.current];
            updated[updated.length - 1] = { role: 'assistant', content: current };
            messagesRef.current = updated;
            setMessages(updated);
          }
        }
        console.log('[ue-flow AI] Stream complete. Chunks:', chunkCount, 'Accumulated length:', accumulated.length);
      } else {
        // Non-streaming response
        console.log('[ue-flow AI] Non-streaming response:', JSON.stringify(streamResult).slice(0, 500));
        accumulated = extractResponseText(streamResult);
        if (accumulated) {
          const updated = [...messagesRef.current, { role: 'assistant' as const, content: accumulated }];
          messagesRef.current = updated;
          setMessages(updated);
        }
      }

      if (!accumulated) {
        // No content — show debug info
        const debugInfo = `(No response received. Raw: ${JSON.stringify(streamResult).slice(0, 300)})`;
        console.error('[ue-flow AI] Empty response. Full object:', streamResult);
        const updated = [...messagesRef.current];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].content === '') {
          updated[updated.length - 1] = { role: 'assistant', content: debugInfo };
        } else {
          updated.push({ role: 'assistant', content: debugInfo });
        }
        messagesRef.current = updated;
        setMessages(updated);
      }
    } catch (err: unknown) {
      console.error('[ue-flow AI] Error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`AI error: ${message}`);
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
