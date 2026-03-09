import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIProvider } from '../contexts/AIProviderContext';
import { parseGeneratedGraph, GENERATE_SYSTEM_PROMPT } from '../utils/ai-generate';
import { loadSignatureDB } from '../utils/signature-db';
import type { ChatMessage } from '../utils/openrouter';
import type { UEGraphJSON } from '../types/ue-graph';

export type { ChatMessage };

const SYSTEM_PROMPT = `You are a UE Blueprint analyst. You directly answer questions about Unreal Engine Blueprint graphs based on the provided context. Never ask clarifying questions — always give your best answer using the graph data you have. Be specific: reference node titles, pin names, and connection paths. Use UE terminology. Keep answers concise but substantive.`;

const MAX_HISTORY = 10;

/** Heuristic: does the user message look like a generation request? */
function isGenerationRequest(msg: string): boolean {
  const lower = msg.toLowerCase();
  const keywords = ['generate', 'create', 'build', 'make', 'add nodes', 'blueprint that', 'blueprint for', 'blueprint to', 'nodes that', 'nodes for', 'graph that', 'graph for', 'implement', 'set up', 'wire up'];
  return keywords.some((k) => lower.includes(k));
}

export function useAIChat(graphContext: string, selectedNodeTitle?: string | null) {
  const { chatCompletion } = useAIProvider();

  // Eagerly load signature DB so it's ready when AI generates a graph
  useEffect(() => { loadSignatureDB(); }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedGraph, setGeneratedGraph] = useState<UEGraphJSON | null>(null);
  const streamingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  const clearGeneratedGraph = useCallback(() => setGeneratedGraph(null), []);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || streamingRef.current) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: userMessage.trim() };

    const updatedMessages = [...messagesRef.current, userMsg].slice(-MAX_HISTORY);
    messagesRef.current = updatedMessages;
    setMessages(updatedMessages);

    setIsStreaming(true);
    streamingRef.current = true;

    // Choose system prompt based on whether this looks like a generation request
    const useGeneratePrompt = isGenerationRequest(userMessage);

    try {
      let systemContent = useGeneratePrompt
        ? GENERATE_SYSTEM_PROMPT
        : `${SYSTEM_PROMPT}\n\nHere is the Blueprint context:\n${graphContext}`;

      if (selectedNodeTitle) {
        systemContent += `\n\nThe user currently has the node '${selectedNodeTitle}' selected. Prioritize information about this node and its connections.`;
      }

      const apiMessages: ChatMessage[] = [
        { role: 'system', content: systemContent },
        ...messagesRef.current,
      ];

      const text = await chatCompletion(apiMessages);

      // Check if response contains a generated graph
      const parsed = parseGeneratedGraph(text);
      if (parsed) {
        setGeneratedGraph(parsed);
      }

      const updated = [...messagesRef.current, { role: 'assistant' as const, content: text }];
      messagesRef.current = updated;
      setMessages(updated);
    } catch (err: unknown) {
      console.error('[ue-flow AI] Error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      const cleaned = messagesRef.current.filter(
        (m, i) => !(i === messagesRef.current.length - 1 && m.role === 'assistant' && m.content === ''),
      );
      messagesRef.current = cleaned;
      setMessages(cleaned);
    } finally {
      setIsStreaming(false);
      streamingRef.current = false;
    }
  }, [graphContext, chatCompletion, selectedNodeTitle]);

  const clearChat = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setGeneratedGraph(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, clearChat, generatedGraph, clearGeneratedGraph };
}
