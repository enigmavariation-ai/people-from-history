import { useEffect, useState } from 'react';

import { loadString, saveString } from '@/lib/storage';

export type CoachmarkStep = {
  // Mono-uppercase amber eyebrow.
  eyebrow: string;
  // Display-serif headline.
  headline: string;
  // Optional body copy.
  body?: string;
};

type CoachmarksProps = {
  // Steps to walk through in order. Last step's primary button reads
  // "Got it" instead of "Next →".
  steps: CoachmarkStep[];
  // Persisted dismissal key, e.g. `onboarding:rounds`. Once dismissed,
  // the coachmark won't re-render for this user on this device.
  storageKey: string;
};

// Onboarding overlay shown once per user. Renders as a bottom-anchored
// card on mobile and a centered modal on desktop. Editorial card,
// amber accent, no spotlight (avoids responsive positioning headaches).
//
// Reads/writes `loadString(storageKey)` to suppress after first
// completion. The component returns `null` after dismissal so callers
// can render it unconditionally.
export function Coachmarks({ steps, storageKey }: CoachmarksProps) {
  const [step, setStep] = useState(0);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Decide on mount whether to show. Tiny delay so the host screen
    // has a chance to render its content (the coachmark looks weird
    // appearing over a still-loading skeleton).
    const t = setTimeout(() => {
      const seen = loadString(storageKey);
      if (!seen) setHidden(false);
    }, 250);
    return () => clearTimeout(t);
  }, [storageKey]);

  // Esc dismisses.
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  if (hidden || steps.length === 0) return null;
  const current = steps[step]!;
  const isLast = step === steps.length - 1;

  function next() {
    if (isLast) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  }

  function dismiss() {
    saveString(storageKey, '1');
    setHidden(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick walkthrough"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm md:items-center"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="m-3 w-full max-w-[440px] rounded-card border border-(--color-rule) bg-(--color-bg) p-5 shadow-[0_12px_32px_-8px_rgba(20,20,25,0.25)] md:p-6"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-amber)">
            {current.eyebrow}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
            {step + 1} of {steps.length}
          </div>
        </div>
        <h2
          className="mb-2 leading-snug"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(22px, 5vw, 28px)',
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.015em',
            textWrap: 'balance',
          }}
        >
          {current.headline}
        </h2>
        {current.body && (
          <p className="mb-5 text-sm leading-normal text-(--color-body)">
            {current.body}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={dismiss}
            className="text-sm text-(--color-muted) underline hover:text-(--color-body)"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="inline-flex min-h-10 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-(--color-amber-hover)"
          >
            {isLast ? 'Got it' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
