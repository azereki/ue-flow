/** Google Gemini API client for browser-side AI calls (free tier). */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export interface GeminiModelOption {
  id: string;
  label: string;
}

export const GEMINI_MODELS: GeminiModelOption[] = [
  { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash (recommended)' },
  { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (fast)' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (fastest)' },
];

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

interface GeminiContent {
  role: string;
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string; code?: number };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Convert our standard ChatMessage[] to Gemini's format.
 * System messages go into system_instruction, assistant → model role.
 */
function toGeminiFormat(messages: ChatMessage[]): { systemInstruction?: { parts: { text: string }[] }; contents: GeminiContent[] } {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content);
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  return {
    ...(systemParts.length > 0 ? { systemInstruction: { parts: systemParts.map(t => ({ text: t })) } } : {}),
    contents,
  };
}

export async function geminiChat(
  messages: ChatMessage[],
  config: GeminiConfig,
): Promise<string> {
  const model = config.model || DEFAULT_GEMINI_MODEL;
  const { systemInstruction, contents } = toGeminiFormat(messages);

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.system_instruction = systemInstruction;
  }

  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (response.status === 400) {
      // Check for invalid key format
      if (errorText.includes('API_KEY_INVALID') || errorText.includes('API key not valid')) {
        throw new Error('Invalid Gemini API key. Check your key at aistudio.google.com.');
      }
      throw new Error(`Gemini error: ${errorText.slice(0, 200)}`);
    }
    if (response.status === 429) {
      throw new Error('Rate limited — Gemini free tier limit reached. Wait a moment or try a different model.');
    }
    if (response.status === 403) {
      throw new Error('Gemini API key not authorized. Enable the Generative Language API in your Google Cloud console.');
    }
    throw new Error(`Gemini error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as GeminiResponse;

  if (data.error?.message) {
    throw new Error(`Gemini: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    throw new Error('Empty response from Gemini.');
  }

  return text;
}

// Storage keys
const KEY_STORAGE = 'uf-gemini-key';
const MODEL_STORAGE = 'uf-gemini-model';
const REMEMBER_STORAGE = 'uf-gemini-remember';

export function loadGeminiConfig(): GeminiConfig | null {
  const remember = localStorage.getItem(REMEMBER_STORAGE) === 'true';
  const storage = remember ? localStorage : sessionStorage;
  const apiKey = storage.getItem(KEY_STORAGE);
  if (!apiKey) return null;
  const model = storage.getItem(MODEL_STORAGE) || DEFAULT_GEMINI_MODEL;
  return { apiKey, model };
}

export function saveGeminiConfig(apiKey: string, model: string, remember: boolean): void {
  sessionStorage.removeItem(KEY_STORAGE);
  sessionStorage.removeItem(MODEL_STORAGE);
  localStorage.removeItem(KEY_STORAGE);
  localStorage.removeItem(MODEL_STORAGE);

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(KEY_STORAGE, apiKey);
  storage.setItem(MODEL_STORAGE, model || DEFAULT_GEMINI_MODEL);
  localStorage.setItem(REMEMBER_STORAGE, String(remember));
}

export function clearGeminiConfig(): void {
  sessionStorage.removeItem(KEY_STORAGE);
  sessionStorage.removeItem(MODEL_STORAGE);
  localStorage.removeItem(KEY_STORAGE);
  localStorage.removeItem(MODEL_STORAGE);
  localStorage.removeItem(REMEMBER_STORAGE);
}

export function getGeminiRememberPreference(): boolean {
  return localStorage.getItem(REMEMBER_STORAGE) === 'true';
}
