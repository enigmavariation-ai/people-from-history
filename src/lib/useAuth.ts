import { useEffect, useState } from 'react';

import { subscribeToAuth, type AuthState } from '@/lib/auth';

// React hook around `subscribeToAuth`. Returns the current auth state
// and re-renders whenever it changes (sign-in, sign-out, token
// refresh, anonymous → permanent upgrade).
//
// During the very first render the SDK is still reading session out
// of localStorage; `state.loading` is `true` for that brief window so
// consumers can render a neutral placeholder instead of flashing the
// signed-out state.
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => subscribeToAuth(setState), []);

  return state;
}
