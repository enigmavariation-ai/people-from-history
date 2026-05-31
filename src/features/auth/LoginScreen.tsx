import { useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

import { AppMenu } from '@/components/AppMenu';
import { signInWithGoogle, signInWithMagicLink } from '@/lib/auth';
import { useAuth } from '@/lib/useAuth';
import type { Screen } from '@/components/ProtoNav';

type LoginScreenProps = { goTo: (s: Screen) => void };

type FormState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string; mode: 'link' | 'otp' }
  | { kind: 'oauth' }
  | { kind: 'error'; message: string };

// Sign-in / sign-up screen. Two paths:
//   1. Email magic-link — works everywhere, no provider setup.
//   2. Google OAuth — faster on mobile, requires the Google provider
//      configured in Supabase (see docs link in the inline banner).
//
// Anonymous visitors keep their existing `user_id` when they sign in
// (handled inside `signInWithMagicLink` / `signInWithGoogle` via
// `updateUser` and `linkIdentity`), so their leaderboard runs and
// profile nickname survive the upgrade.
export function LoginScreen({ goTo }: LoginScreenProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const isAnon = !!user?.is_anonymous;
  const alreadySignedIn = !!user && !user.is_anonymous;

  // Cloudflare Turnstile captcha. Required for any new-session
  // sign-in (Supabase rejects OTP and OAuth requests without a token
  // when project-level captcha is enabled). The token is single-use;
  // reset the widget after each submit so a retry produces a fresh
  // one.
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  // The captcha is only needed when we'll actually create a new
  // session — i.e. when the visitor is NOT already anon (anon
  // upgrades via updateUser don't hit the captcha).
  const captchaRequired = !!turnstileSiteKey && !isAnon;

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const submitMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind === 'sending') return;
    setState({ kind: 'sending' });
    try {
      const result = await signInWithMagicLink(email, captchaToken ?? undefined);
      setState({ kind: 'sent', email: email.trim().toLowerCase(), mode: result.kind });
      resetCaptcha();
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : "Couldn't send the link.",
      });
      resetCaptcha();
    }
  };

  const startGoogle = async () => {
    if (state.kind === 'oauth') return;
    setState({ kind: 'oauth' });
    try {
      await signInWithGoogle(captchaToken ?? undefined);
      // signInWithGoogle redirects away; if it returned without
      // redirecting, surface the issue rather than silently sitting
      // in the loading state.
      setTimeout(() => {
        setState((s) =>
          s.kind === 'oauth'
            ? { kind: 'error', message: 'Google sign-in did not redirect. Is the provider enabled in Supabase?' }
            : s,
        );
      }, 5000);
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : "Couldn't start Google sign-in.",
      });
      resetCaptcha();
    }
  };

  // If a permanent session already exists, send them straight to
  // Profile rather than asking them to sign in again.
  if (alreadySignedIn) {
    return (
      <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
        <div className="mx-auto max-w-[440px] px-6 pb-20 pt-6 md:px-6 md:pt-10">
          <div className="mb-6">
            <AppMenu goTo={goTo} currentScreen="login" />
          </div>
          <h1
            className="mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(26px, 6vw, 36px)',
              lineHeight: 1.1,
              fontWeight: 500,
              color: 'var(--color-ink)',
              letterSpacing: '-0.018em',
            }}
          >
            You're signed in.
          </h1>
          <p className="mb-6 text-sm text-(--color-muted)">
            {user?.email ?? 'Your account is active.'}
          </p>
          <button
            onClick={() => goTo('profile')}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
          >
            See your profile →
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === 'sent') {
    return (
      <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
        <div className="mx-auto max-w-[440px] px-6 pb-20 pt-6 md:px-6 md:pt-10">
          <div className="mb-6">
            <AppMenu goTo={goTo} currentScreen="login" />
          </div>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
            § Check your inbox
          </div>
          <h1
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 6vw, 38px)',
              lineHeight: 1.1,
              fontWeight: 500,
              color: 'var(--color-ink)',
              letterSpacing: '-0.018em',
              textWrap: 'balance',
            }}
          >
            We sent a link to{' '}
            <em className="font-normal italic text-(--color-amber)">{state.email}</em>.
          </h1>
          <p className="mb-6 text-sm text-(--color-muted)">
            {state.mode === 'link'
              ? "Open it on this device to confirm your email. Your existing streak and history will stay attached."
              : "Open it to sign in. You'll come right back here."}
          </p>
          <button
            onClick={() => setState({ kind: 'idle' })}
            className="text-sm text-(--color-muted) underline hover:text-(--color-body)"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[440px] px-6 pb-20 pt-6 md:px-6 md:pt-10">
        <div className="mb-6">
          <AppMenu goTo={goTo} currentScreen="login" />
        </div>

        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
          § Save your progress
        </div>
        <h1
          className="mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 7vw, 44px)',
            lineHeight: 1.05,
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.018em',
            textWrap: 'balance',
          }}
        >
          Sign in across{' '}
          <em className="font-normal italic text-(--color-amber)">devices</em>.
        </h1>
        <p className="mb-7 text-base leading-normal text-(--color-muted)">
          {isAnon
            ? 'Link your account so your streaks and history come with you to your phone, laptop, anywhere.'
            : 'One tap and your daily streak, run history, and figures-seen carry across every device you play on.'}
        </p>

        <form onSubmit={submitMagicLink} className="mb-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state.kind === 'sending'}
            className="mb-2 min-h-12 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3 text-base text-(--color-ink) placeholder:text-(--color-muted) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2]"
          />
          <button
            type="submit"
            disabled={
              state.kind === 'sending' ||
              email.trim().length === 0 ||
              (captchaRequired && !captchaToken)
            }
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.kind === 'sending'
              ? 'Sending…'
              : captchaRequired && !captchaToken
                ? 'Verifying…'
                : 'Send magic link →'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-(--color-muted)">
          <div className="h-px flex-1 bg-(--color-hairline)" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]">or</span>
          <div className="h-px flex-1 bg-(--color-hairline)" />
        </div>

        <button
          onClick={startGoogle}
          disabled={state.kind === 'oauth' || (captchaRequired && !captchaToken)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-button border border-(--color-hairline-strong) bg-white px-6 py-3 text-sm font-medium text-(--color-ink) transition-colors duration-150 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleGlyph />
          {state.kind === 'oauth' ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Cloudflare Turnstile — invisible-or-checkbox depending on
            Turnstile's call; produces a single-use token consumed by
            Supabase on sign-in. Anon-upgrade users skip this since
            updateUser doesn't require captcha. */}
        {turnstileSiteKey && captchaRequired && (
          <div className="mt-4 flex items-center gap-3">
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              onSuccess={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              options={{
                appearance: 'always',
                refreshExpired: 'auto',
                theme: 'light',
                size: 'compact',
              }}
            />
            {!captchaToken && (
              <span className="text-xs text-(--color-muted)">
                Verifying you're human…
              </span>
            )}
          </div>
        )}
        {!turnstileSiteKey && (
          <div className="mt-4 rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
            Turnstile site key not set. Add <code>VITE_TURNSTILE_SITE_KEY</code> to
            <code>.env.local</code> and restart the dev server.
          </div>
        )}

        {state.kind === 'error' && (
          <div className="mt-4 rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
            {state.message}
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-(--color-muted)">
          By signing in you agree we can email you a sign-in link. No spam, no
          newsletter; you can sign out and delete your account anytime.
        </p>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  // Multi-colour Google "G" rendered inline; same one Google's brand
  // guidelines specify for "Continue with Google" buttons.
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
