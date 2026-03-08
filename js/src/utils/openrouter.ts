/** OpenRouter API client for browser-side AI calls. */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-6';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterConfig {
  apiKey: string;
  model?: string;
}

interface OpenRouterChoice {
  message?: { content?: string };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: { message?: string };
}

export async function openRouterChat(
  messages: ChatMessage[],
  config: OpenRouterConfig,
): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ue-flow Blueprint Viewer',
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODEL,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid API key. Check your OpenRouter key and try again.');
    }
    throw new Error(`OpenRouter error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (data.error?.message) {
    throw new Error(`OpenRouter: ${data.error.message}`);
  }

  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) {
    throw new Error('Empty response from OpenRouter.');
  }

  return text;
}

// Storage keys
const KEY_STORAGE = 'uf-openrouter-key';
const MODEL_STORAGE = 'uf-openrouter-model';
const REMEMBER_STORAGE = 'uf-openrouter-remember';

export function loadOpenRouterConfig(): OpenRouterConfig | null {
  const remember = localStorage.getItem(REMEMBER_STORAGE) === 'true';
  const storage = remember ? localStorage : sessionStorage;
  const apiKey = storage.getItem(KEY_STORAGE);
  if (!apiKey) return null;
  const model = storage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
  return { apiKey, model };
}

export function saveOpenRouterConfig(apiKey: string, model: string, remember: boolean): void {
  // Clear from both storages first
  sessionStorage.removeItem(KEY_STORAGE);
  sessionStorage.removeItem(MODEL_STORAGE);
  localStorage.removeItem(KEY_STORAGE);
  localStorage.removeItem(MODEL_STORAGE);

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(KEY_STORAGE, apiKey);
  storage.setItem(MODEL_STORAGE, model || DEFAULT_MODEL);
  localStorage.setItem(REMEMBER_STORAGE, String(remember));
}

export function clearOpenRouterConfig(): void {
  sessionStorage.removeItem(KEY_STORAGE);
  sessionStorage.removeItem(MODEL_STORAGE);
  localStorage.removeItem(KEY_STORAGE);
  localStorage.removeItem(MODEL_STORAGE);
  localStorage.removeItem(REMEMBER_STORAGE);
}

export function getRememberPreference(): boolean {
  return localStorage.getItem(REMEMBER_STORAGE) === 'true';
}

export { DEFAULT_MODEL };
