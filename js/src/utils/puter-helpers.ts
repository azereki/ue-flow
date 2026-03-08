/** Shared Puter.js utilities for AI features. */

export const MODEL = 'claude-sonnet-4-6';
export const TIMEOUT_MS = 30_000;

/** Extract text from a non-streaming Puter.js response. */
export function extractResponseText(resp: unknown): string {
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

/** Wrap a promise with a timeout. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s — Puter auth may not have completed. Allow popups for this site and try again.`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Check if the Puter.js global is loaded (script may still be loading from CDN). */
export function isPuterAvailable(): boolean {
  return typeof puter !== 'undefined' && !!puter?.ai;
}
