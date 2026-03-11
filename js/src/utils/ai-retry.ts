/**
 * Shared retry and timeout utilities for AI provider API calls.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Classify an HTTP status code into a user-friendly error message.
 */
export function classifyHttpError(status: number, providerName: string, fallbackText: string): string {
  if (status === 401 || status === 403) {
    return `Invalid API key. Check your ${providerName} settings.`;
  }
  if (status >= 500) {
    return `${providerName} is experiencing issues. Try again later.`;
  }
  return `${providerName} error (${status}): ${fallbackText.slice(0, 200)}`;
}

/**
 * Wrap a fetch call with a 30-second timeout via AbortController.
 * Returns the Response, or throws a timeout error.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds.');
    }
    // Network errors
    if (err instanceof TypeError) {
      throw new Error('Network error. Check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute an async function with retry logic for 429 (rate limit) responses.
 * The function should throw an error with '429' in the message to trigger retry.
 *
 * @param fn - Async function to execute. Receives the attempt number (0-based).
 * @returns The result of fn on success.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      // Only retry on rate limit (429)
      const isRateLimit =
        error.message.includes('429') || error.message.toLowerCase().includes('rate limit');

      if (!isRateLimit || attempt >= MAX_RETRIES - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[ue-flow AI] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Retry failed');
}
