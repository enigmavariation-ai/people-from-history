import { useState } from 'react';

import type { Screen } from '@/components/ProtoNav';

type DailyResultProps = { goTo: (s: Screen) => void };

export function DailyResult({ goTo }: DailyResultProps) {
  const [copied, setCopied] = useState(false);

  const revealPct = 28;
  const points = 72;
  const streakDay = 4;
  const filled = Math.max(1, Math.round(revealPct / 10));
  const squares = Array.from({ length: 10 }, (_, i) => i < filled);
  const dateLabel = 'Friday, May 15';

  const shareText =
    'People from History · May 15\n' +
    `Solved at ${revealPct}% reveal · ${points} pts\n` +
    '🟧🟧🟧⬜⬜⬜⬜⬜⬜⬜\n' +
    `Day ${streakDay} streak`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[440px] px-6 pb-24 pt-12">
        <div className="mb-10">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              goTo('landing');
            }}
            className="text-sm text-(--color-muted) no-underline"
          >
            ← Home
          </a>
        </div>

        <div className="mb-3.5 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
          № 142 &nbsp;·&nbsp; {dateLabel}
        </div>

        <div className="pfh-ornament mb-7">
          <div className="rule" />
          <div className="dot" />
          <div className="rule" />
        </div>

        <h1
          className="mb-4 text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 40,
            lineHeight: 1.1,
            fontWeight: 400,
            letterSpacing: '-0.018em',
            color: 'var(--color-ink)',
            textWrap: 'balance',
          }}
        >
          Solved at{' '}
          <em className="font-normal italic text-(--color-amber)">{revealPct}%</em> reveal.
        </h1>
        <div className="mb-12 text-center text-lg text-(--color-muted)">
          +{points} points &nbsp;·&nbsp; Day {streakDay} streak
        </div>

        <div
          aria-label={`Solved at ${revealPct}% reveal, shown as ${filled} of 10 squares filled`}
          className="mb-3.5 grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}
        >
          {squares.map((on, i) => (
            <div
              key={i}
              aria-hidden
              className="aspect-square rounded-sm border"
              style={{
                background: on ? 'var(--color-amber-soft-2)' : 'transparent',
                borderColor: on ? 'var(--color-amber-soft-2)' : 'var(--color-hairline)',
              }}
            />
          ))}
        </div>
        <div className="mb-9 text-center font-display text-sm italic text-(--color-muted)">
          Plate of today's solve &nbsp;—&nbsp; {filled} of 10 increments shaded.
        </div>

        <button
          onClick={copy}
          className="mb-5 inline-flex min-h-11 w-full items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
        >
          {copied ? 'Copied!' : 'Copy result'}
        </button>

        <pre
          aria-label="Share preview"
          className="mb-10 whitespace-pre-wrap break-words rounded border border-(--color-rule) bg-(--color-paper) px-5 py-4.5 font-mono text-[13px] leading-[1.7] text-(--color-body)"
        >
{`People from History · May 15
Solved at ${revealPct}% reveal · ${points} pts
🟧🟧🟧⬜⬜⬜⬜⬜⬜⬜
Day ${streakDay} streak`}
        </pre>

        <div className="pfh-ornament mb-6">
          <div className="rule" />
          <div className="dot" />
          <div className="rule" />
        </div>

        <div className="mb-3.5 text-center text-sm text-(--color-muted)">
          Come back tomorrow for a new puzzle.
        </div>

        <div className="text-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              goTo('play-setup');
            }}
            className="text-sm font-medium text-(--color-amber) no-underline"
          >
            Play unlimited mode →
          </a>
        </div>
      </div>
    </div>
  );
}
