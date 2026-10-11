import { useCallback, useEffect, useState } from 'react';
import type { AppConfig } from '../lib/config';
import { signIn as googleSignIn, signOut as googleSignOut, type Session } from '../lib/google';

/**
 * "Continue with Google" sign-in. The session lives in memory only, so a reload signs you out,
 * and it ends by itself when Google's token expires (about an hour).
 *
 *   const { session, signingIn, error, signIn, signOut } = useAuth(config);
 */
export function useAuth(config: AppConfig) {
  const [session, setSession] = useState<Session>();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  const signIn = useCallback(async () => {
    setError('');
    setSigningIn(true);
    try {
      setSession(await googleSignIn(config));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSigningIn(false);
    }
  }, [config]);

  const signOut = useCallback(() => {
    if (session) googleSignOut(session);
    setSession(undefined);
    setError('');
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      setSession(undefined);
      setError('Your session expired. Continue with Google to sign in again.');
    }, session.expiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [session]);

  return { session, signingIn, error, signIn, signOut };
}
