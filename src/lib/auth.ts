// Authentication helpers.
//
// Three kinds of users coexist:
//   1. **Signed-out** — no session at all (only happens before the first
//      anon sign-in is triggered, e.g. when someone lands on Landing).
//   2. **Anonymous** — Supabase anon session (created by ensureAnonAuth
//      when they submit a challenge run). Has a stable `user_id` but
//      no email; state is device-bound.
//   3. **Permanent** — anon user has been upgraded by linking an email
//      (magic-link) or OAuth identity. Same `user_id` as before the
//      link, so `profiles` and `runs` rows survive the upgrade.
//
// The upgrade path uses Supabase's identity-linking primitives:
//   - `auth.updateUser({ email })` for magic-link upgrade — sends a
//     confirmation email; clicking the link permanently attaches the
//     email to the anon user.
//   - `auth.linkIdentity({ provider })` for OAuth upgrade — opens a
//     redirect flow that returns linked.
//
// For users who arrive with no anon session, we fall back to
// `signInWithOtp` and `signInWithOAuth` which create a fresh user_id.
// That's the trade-off: we can't preserve history if there's nothing
// to preserve.

import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type AuthState = {
  user: User | null;
  // `true` while we're still figuring out the initial session (Supabase
  // reads from localStorage asynchronously on app boot). Components
  // should render a neutral state during this window.
  loading: boolean;
};

// ---- introspection -------------------------------------------------------

export function isAnonymous(user: User | null): boolean {
  return !!user?.is_anonymous;
}

export function isPermanent(user: User | null): boolean {
  return !!user && !user.is_anonymous;
}

export function userEmail(user: User | null): string | null {
  return user?.email ?? null;
}

// Curation admin allowlist. Kept in sync with the SQL policy in
// `supabase/migrations/0006_admin_figure_updates.sql` — change both
// together. Tiny attack surface: only enables the audit-gallery
// editor on the client; writes still go through RLS server-side.
const ADMIN_EMAILS = new Set(['niklas.fip@gmail.com']);

export function isAdmin(user: User | null): boolean {
  return !!user?.email && ADMIN_EMAILS.has(user.email);
}

// Best-effort display name for the user, in priority order:
//   1. Supabase profiles.nickname (what they entered on the leaderboard)
//   2. OAuth-supplied full name (`user_metadata.full_name`)
//   3. Email local-part
//   4. "Player"
// Fetching the profile is async, so consumers usually pass a fallback.
export function userDisplayLabel(user: User | null, nickname: string | null): string {
  if (nickname) return nickname;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.full_name === 'string' && meta.full_name) return meta.full_name;
  if (typeof meta.name === 'string' && meta.name) return meta.name;
  if (user?.email) return user.email.split('@')[0] ?? user.email;
  return 'Player';
}

// ---- session lifecycle ---------------------------------------------------

// Where to return to after magic-link / OAuth redirect. We come back to
// the app's origin; the SDK reads the auth tokens out of the URL on
// load and clears them.
function redirectUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

// Sign in / sign up with an email magic link.
// - If the visitor is already anon: tries to link the email to the
//   existing anon user via `updateUser`. The confirmation email
//   contains a token that makes the anon user permanent —
//   preserving user_id, all runs, all history.
// - If the email is already registered as a different user, we can't
//   link. Sign out the anon session and fall back to OTP sign-in;
//   any local state on this device gets merged into the existing
//   account by the auth listener once the user clicks the link.
// - Otherwise (no session): standard OTP sign-in.
//
// `captchaToken` is required for any new-session sign-in action when
// the Supabase project has captcha enabled (currently Cloudflare
// Turnstile). Anon → email-link upgrades don't need one because the
// user is already authenticated.
//
// Returns `{ kind: 'link' }` for the anon-upgrade path and
// `{ kind: 'otp' }` for the regular sign-in path so the UI can word
// the confirmation message accordingly.
export async function signInWithMagicLink(
  email: string,
  captchaToken?: string,
): Promise<{ kind: 'link' | 'otp' }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error('Email is required.');

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const isAnon = !!session?.user?.is_anonymous;

  if (isAnon) {
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (!error) return { kind: 'link' };
    // Email already belongs to a permanent user — drop the anon
    // session and fall through to OTP sign-in. The user's anon-side
    // local state stays in localStorage and gets reconciled by
    // syncState once the new session is established.
    const msg = error.message?.toLowerCase() ?? '';
    const emailTaken =
      msg.includes('already') ||
      msg.includes('exists') ||
      error.status === 422;
    if (!emailTaken) throw error;
    await supabase.auth.signOut();
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { emailRedirectTo: redirectUrl(), captchaToken },
  });
  if (error) throw error;
  return { kind: 'otp' };
}

// Sign in / sign up with Google. Redirects away from the SPA to
// Google's consent screen, then back to `redirectUrl()` with tokens.
// Anonymous users get their existing user_id preserved via
// linkIdentity. If the Google identity is already linked to another
// user, we drop the anon session and fall through to a regular
// OAuth sign-in. The captchaToken arg is accepted (and ignored) for
// API symmetry with `signInWithMagicLink`; OAuth providers handle
// bot protection on their own side, so Supabase doesn't accept a
// captcha token on this path.
export async function signInWithGoogle(_captchaToken?: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const isAnon = !!session?.user?.is_anonymous;

  if (isAnon) {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: redirectUrl() },
    });
    if (!error) return;
    const msg = error.message?.toLowerCase() ?? '';
    const identityTaken =
      msg.includes('already') ||
      msg.includes('exists') ||
      error.status === 422;
    if (!identityTaken) throw error;
    await supabase.auth.signOut();
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  });
  if (error) throw error;
}

// Sign out of any session — anon or permanent. After this, the user
// has no session at all. If they trigger an action that needs auth
// (e.g. submitting a challenge run), a fresh anon session will be
// minted by ensureAnonAuth.
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Subscribe to auth changes. Returns an unsubscribe function. The
// callback is fired with the current session immediately after the
// SDK finishes initial session detection (a few ms after page load).
export function subscribeToAuth(
  callback: (state: AuthState) => void,
): () => void {
  let firedInitial = false;

  // Fire current session synchronously where possible.
  supabase.auth.getSession().then(({ data: { session } }) => {
    firedInitial = true;
    callback({ user: session?.user ?? null, loading: false });
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback({ user: session?.user ?? null, loading: !firedInitial });
  });

  return () => subscription.unsubscribe();
}
