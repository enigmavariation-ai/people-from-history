import { isPermanent } from '@/lib/auth';
import { useAuth } from '@/lib/useAuth';
import type { Screen } from '@/components/ProtoNav';

type SignUpNudgeProps = {
  goTo: (s: Screen) => void;
  // Eyebrow (e.g. "Don't lose this") — mono uppercase amber.
  eyebrow: string;
  // Single-line headline — display serif, bigger.
  headline: string;
  // Optional sub-paragraph for context.
  body?: string;
  // Override the default "Sign in to save →" label.
  ctaLabel?: string;
};

// Contextual sign-up prompt rendered inline at moments where the user
// has just earned something worth saving — daily wins, completed
// challenge runs, milestone streaks. Auto-hides when the visitor is
// already signed in (permanent), so callers can render it
// unconditionally.
//
// Editorial layout: amber-soft card with an eyebrow + headline + CTA.
// Quiet enough to ignore, prominent enough to convert.
export function SignUpNudge({
  goTo,
  eyebrow,
  headline,
  body,
  ctaLabel = 'Sign in to save →',
}: SignUpNudgeProps) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (isPermanent(user)) return null;

  return (
    <div className="rounded-card border border-(--color-amber)/60 bg-(--color-amber-soft)/30 px-4 py-4 md:px-5 md:py-5">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-amber)">
        § {eyebrow}
      </div>
      <div
        className="mb-1.5 leading-snug"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(18px, 4.5vw, 22px)',
          fontWeight: 500,
          color: 'var(--color-ink)',
          letterSpacing: '-0.01em',
          textWrap: 'balance',
        }}
      >
        {headline}
      </div>
      {body && (
        <p className="mb-3 text-sm text-(--color-body)">{body}</p>
      )}
      <button
        onClick={() => goTo('login')}
        className="inline-flex min-h-10 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
