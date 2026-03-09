import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIProvider } from '../contexts/AIProviderContext';
import { parseGeneratedGraph, GENERATE_SCHEMA_ADDENDUM } from '../utils/ai-generate';
import { loadSignatureDB } from '../utils/signature-db';
import type { ChatMessage } from '../utils/openrouter';
import type { UEGraphJSON } from '../types/ue-graph';

export type { ChatMessage };

const ANALYST_SYSTEM_PROMPT = `You are a UE Blueprint analyst for the ue-flow viewer tool.

## Role
Analyze Unreal Engine Blueprint graphs and answer user questions based on the graph data provided below.

## Response Guidelines
- Reference specific node titles, pin names, and connection paths from the graph data
- Use standard UE terminology (exec pins, pure nodes, event dispatchers, etc.)
- Give your best answer using available data — do not ask clarifying questions
- Keep answers concise but substantive (3-8 sentences for simple questions)
- When describing execution flow, trace the path: NodeA.then → NodeB.execute → ...
- For pin questions, specify direction (input/output), category, and default values

## Blueprint Context
Based on the Blueprint data below, answer the user's question:
`;

const MAX_HISTORY = 10;

/** Strong generation signals — always trigger generation mode. */
const STRONG_GENERATION_SIGNALS = [
  'generate a', 'generate me', 'generate the',
  'create a blueprint', 'create blueprint', 'create a graph', 'create nodes',
  'build me', 'build a blueprint', 'build a graph',
  'add nodes for', 'add nodes that',
  'wire up', 'implement a', 'implement the',
  'i need a blueprint', 'i need nodes',
];

/** Weak generation signals — only trigger if NOT preceded by question patterns. */
const WEAK_GENERATION_SIGNALS = ['make', 'create', 'build', 'set up', 'add'];

/** Question patterns that suppress weak signals. */
const QUESTION_ANTI_PATTERNS = /(?:^(?:what|how|why|where|when|which|who|does|is|are|can|could|would|should|do)\b|[?]\s*$)/i;

/** Heuristic: does the user message look like a generation request? */
export function isGenerationRequest(msg: string): boolean {
  const lower = msg.toLowerCase().trim();

  // Strong signals always trigger
  if (STRONG_GENERATION_SIGNALS.some((s) => lower.includes(s))) return true;

  // Keywords that always indicate generation regardless of question form
  if (['blueprint that', 'blueprint for', 'blueprint to', 'nodes that', 'nodes for', 'graph that', 'graph for'].some((k) => lower.includes(k))) return true;

  // Weak signals only trigger if NOT a question
  if (WEAK_GENERATION_SIGNALS.some((s) => lower.includes(s)) && !QUESTION_ANTI_PATTERNS.test(lower)) return true;

  // Explicit generation verbs
  if (lower.includes('generate') || lower.includes('implement')) return true;

  return false;
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

    // Inject selected node context as user message prefix (closer to the question = better relevance)
    const contextPrefix = selectedNodeTitle ? `[Selected node: "${selectedNodeTitle}"] ` : '';
    const userMsg: ChatMessage = { role: 'user', content: contextPrefix + userMessage.trim() };

    const updatedMessages = [...messagesRef.current, userMsg].slice(-MAX_HISTORY);
    messagesRef.current = updatedMessages;
    setMessages(updatedMessages);

    setIsStreaming(true);
    streamingRef.current = true;

    try {
      // Hybrid prompt: analyst base + generation schema appended when needed
      let systemContent = ANALYST_SYSTEM_PROMPT + '\n' + graphContext;
      if (isGenerationRequest(userMessage)) {
        systemContent += '\n\n' + GENERATE_SCHEMA_ADDENDUM;
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
