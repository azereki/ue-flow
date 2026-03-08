/** Minimal type declarations for Puter.js (https://js.puter.com/v2/) */

interface PuterAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PuterAIChatOptions {
  model?: string;
  stream?: boolean;
}

interface PuterAIChatResponse {
  message: {
    content: string;
    role: string;
  };
}

interface PuterAIStreamPart {
  text?: string;
}

interface PuterAI {
  chat(
    messages: string | PuterAIChatMessage[],
    options?: PuterAIChatOptions & { stream?: false },
  ): Promise<PuterAIChatResponse>;
  chat(
    messages: string | PuterAIChatMessage[],
    options: PuterAIChatOptions & { stream: true },
  ): Promise<AsyncIterable<PuterAIStreamPart>>;
  chat(
    messages: string | PuterAIChatMessage[],
    options?: PuterAIChatOptions,
  ): Promise<PuterAIChatResponse | AsyncIterable<PuterAIStreamPart>>;
}

interface Puter {
  ai: PuterAI;
}

declare const puter: Puter;

interface Window {
  puter: Puter;
}
