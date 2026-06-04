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
  // When the win extends a streak of 2+, show "· streak N" beneath
  // the points line in italic gold so the moment is connected to
  // the streak halo running on the score pill. Pass 0/1 to hide.
  streak?: number;
  // Figure name + a short meta line ("Physics · 20th century") shown
  // below the phrase so players learn *who* they got right in the
  // moment, not just that they got it right. Helps discoverability
  // of the dossier panel without an intrusive overlay.
  figureName?: string;
  figureMeta?: string;
};

// Center-screen overlay that flashes a "well done" phrase + points on
// a correct guess. Mounted by the round chrome only while pulse is
// active; auto-unmounts after the 1.8s animation via parent.
//
// The phrase is picked once per mount (useMemo gated on `trigger`) so
// it stays stable through the animation and rotates on the next win.
export function WinCelebration({
  trigger,
  pointsLabel,
  streak = 0,
  figureName,
  figureMeta,
}: WinCelebrationProps) {
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
      {/* Glass card — same blur + saturation as the floating nav pill,
          so the phrase and points stay legible against any portrait
          underneath. Pure opacity animation, no movement. */}
      <div
        className="pfh-celebrate flex flex-col items-center gap-2 px-7 py-5 text-center"
        style={{
          background: 'rgba(248, 241, 222, 0.78)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.5) inset, 0 12px 32px rgba(22,22,22,0.12)',
          borderRadius: 18,
        }}
      >
        <div
          className="leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 7vw, 56px)',
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.02em',
            textWrap: 'balance',
          }}
        >
          {phrase}
        </div>
        {figureName && (
          <div
            className="italic"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 500,
              color: 'var(--color-amber)',
              letterSpacing: '-0.014em',
              textWrap: 'balance',
            }}
          >
            {figureName}
          </div>
        )}
        {figureMeta && (
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-muted)">
            {figureMeta}
          </div>
        )}
        {pointsLabel && (
          <div className="font-mono text-sm uppercase tracking-[0.18em] text-(--color-amber)">
            {pointsLabel}
          </div>
        )}
        {streak >= 2 && (
          <div
            className="italic"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--color-gold)',
              letterSpacing: '-0.01em',
            }}
          >
            {streak} in a row
          </div>
        )}
      </div>
    </div>
  );
}
