import { useState, useCallback, useEffect } from 'react';
import { isPuterAvailable } from '../utils/puter-helpers';

export type AuthState = 'checking' | 'unavailable' | 'signed-out' | 'signing-in' | 'signed-in' | 'error';

export function usePuterAuth() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [authError, setAuthError] = useState<string | null>(null);

  // Check auth on mount — Puter.js may still be loading from CDN
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds max wait

    const check = () => {
      if (isPuterAvailable()) {
        try {
          setAuthState(puter.auth.isSignedIn() ? 'signed-in' : 'signed-out');
        } catch {
          setAuthState('signed-out');
        }
        return;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        setAuthState('unavailable');
        return;
      }
      setTimeout(check, 100);
    };

    check();
  }, []);

  const signIn = useCallback(async () => {
    setAuthState('signing-in');
    setAuthError(null);
    try {
      await puter.auth.signIn();
      setAuthState('signed-in');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setAuthError(message);
      setAuthState('error');
    }
  }, []);

  return { authState, authError, signIn };
}
