/** OpenRouter API client for browser-side AI calls. */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';

export interface ModelOption {
  id: string;
  label: string;
  tier: 'budget' | 'standard' | 'premium';
}

/**
 * Curated models known to perform well on UE Blueprint analysis.
 * Ordered by tier (budget → premium), then by quality within each tier.
 * Free models removed — use Gemini provider for free access.
 */
export const MODEL_OPTIONS: ModelOption[] = [
  // Budget — under $1/M input tokens
  { id: 'openai/gpt-4.1-nano',                               label: 'GPT-4.1 Nano (~$0.10/M)',     tier: 'budget' },
  { id: 'google/gemini-2.0-flash-001',                       label: 'Gemini 2.0 Flash (~$0.10/M)',  tier: 'budget' },
  { id: 'openai/gpt-4o-mini',                                label: 'GPT-4o Mini (~$0.15/M)',       tier: 'budget' },
  { id: 'google/gemini-2.5-flash',                           label: 'Gemini 2.5 Flash (~$0.30/M)',  tier: 'budget' },
  { id: 'deepseek/deepseek-chat',                            label: 'DeepSeek V3 (~$0.32/M)',       tier: 'budget' },
  { id: 'openai/gpt-4.1-mini',                               label: 'GPT-4.1 Mini (~$0.40/M)',      tier: 'budget' },
  // Standard
  { id: 'anthropic/claude-3.5-haiku',                        label: 'Claude 3.5 Haiku (~$0.80/M)',  tier: 'standard' },
  { id: 'google/gemini-2.5-pro',                             label: 'Gemini 2.5 Pro (~$1.25/M)',    tier: 'standard' },
  // Premium — best quality
  { id: 'anthropic/claude-sonnet-4.6',                       label: 'Claude Sonnet 4.6 (~$3/M)',    tier: 'premium' },
];

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
    if (response.status === 429) {
      // Try to extract the model name from the error for a helpful message
      const modelName = (config.model || DEFAULT_MODEL).split('/').pop()?.replace(/:free$/, '') ?? 'this model';
      throw new Error(`Rate limited — ${modelName} is temporarily overloaded. Try a different model or wait a moment.`);
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
