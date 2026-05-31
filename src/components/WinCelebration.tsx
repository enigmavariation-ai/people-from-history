import { useEffect, useMemo, useState } from 'react';

// Editorial phrasebook for correct guesses. Rotated randomly so the
// same phrase doesn't appear on consecutive wins. Tone matches the
// rest of the app — no exclamation pile-ups, no "awesome".
const PHRASES = [
  'Well done.',
  'Sharp eye.',
  'Got them.',
  'Nailed it.',
  'Easy work.',
  'Bullseye.',
  'Picked clean.',
  'Beautifully done.',
  'Spot on.',
  'Right on.',
];

type WinCelebrationProps = {
  // Re-mounted whenever this changes — usually the figure ID, so a
  // new win restarts the animation cleanly.
  trigger: string | number;
  // Optional points text shown beneath the phrase ("+8 points"). Pass
  // null in Practice mode (no scoring).
  pointsLabel: string | null;
};

// Center-screen overlay that flashes a "well done" phrase + points on
// a correct guess. Mounted by the round chrome only while pulse is
// active; auto-unmounts after the 1.8s animation via parent.
//
// The phrase is picked once per mount (useMemo gated on `trigger`) so
// it stays stable through the animation and rotates on the next win.
export function WinCelebration({ trigger, pointsLabel }: WinCelebrationProps) {
  const phrase = useMemo(() => {
    return PHRASES[Math.floor(Math.random() * PHRASES.length)] ?? PHRASES[0];
  }, [trigger]);

  // Hide entirely after the animation completes so the overlay can't
  // intercept anything (we also use pointer-events-none for safety).
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false);
    const t = setTimeout(() => setHidden(true), 1900);
    return () => clearTimeout(t);
  }, [trigger]);

  if (hidden) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="pfh-celebrate flex flex-col items-center gap-2 px-6 text-center">
        <div
          className="leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 8vw, 64px)',
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.02em',
            textShadow: '0 1px 24px var(--color-bg)',
            textWrap: 'balance',
          }}
        >
          {phrase}
        </div>
        {pointsLabel && (
          <div
            className="font-mono text-sm uppercase tracking-[0.18em] text-(--color-amber)"
            style={{ textShadow: '0 1px 24px var(--color-bg)' }}
          >
            {pointsLabel}
          </div>
        )}
      </div>
    </div>
  );
}
