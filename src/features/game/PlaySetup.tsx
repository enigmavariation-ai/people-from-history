import { loadString, saveString } from '@/lib/storage';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty } from '@/types/figure';

type PlaySetupProps = { goTo: (s: Screen) => void };

const PRACTICE_DIFFICULTIES: ReadonlyArray<{
  key: Difficulty;
  label: string;
  blurb: string;
}> = [
  {
    key: 'easy',
    label: 'Easy',
    blurb: 'Globally famous figures — the names you grew up with.',
  },
  {
    key: 'medium',
    label: 'Medium',
    blurb: 'Recognizable, not handed to you. Spans fields, eras, and continents.',
  },
  {
    key: 'hard',
    label: 'Hard',
    blurb: 'Deep cuts. Philosophers, obscure royals, ancients — for the well-read.',
  },
];

function currentDifficulty(): Difficulty {
  const v = loadString('difficulty');
  if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  return 'easy';
}

export function PlaySetup({ goTo }: PlaySetupProps) {
  const { figures, loading } = useFigures();
  const current = currentDifficulty();

  const counts: Record<Difficulty, number> = {
    easy: figures.filter((f) => f.difficulty === 'easy').length,
    medium: figures.filter((f) => f.difficulty === 'medium').length,
    hard: figures.filter((f) => f.difficulty === 'hard').length,
  };

  const startPractice = (d: Difficulty) => {
    saveString('difficulty', d);
    goTo('game');
  };

  const startChallenge = () => {
    goTo('challenge');
  };

  return (
    <div className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[640px] px-6 pb-24 pt-12">
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

        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
          § Today
        </div>
        <h1
          className="mb-3"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 40,
            lineHeight: 1.1,
            fontWeight: 400,
            letterSpacing: '-0.015em',
            textWrap: 'balance',
          }}
        >
          Choose your{' '}
          <em className="font-normal italic text-(--color-amber)">mode</em>.
        </h1>
        <p className="mb-10 text-lg leading-normal text-(--color-muted)">
          One competitive run, or open-ended practice at a tier of your choosing.
        </p>

        {/* Featured: Challenge */}
        <button
          onClick={startChallenge}
          className="group mb-10 flex w-full items-start gap-5 rounded-card border-2 border-(--color-amber) bg-(--color-amber-soft)/30 px-6 py-7 text-left transition-colors duration-150 hover:bg-(--color-amber-soft)/50"
        >
          <span className="font-display text-4xl italic leading-none text-(--color-amber)">
            01
          </span>
          <span className="flex-1">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-amber)">
              Featured
            </div>
            <div
              className="mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26,
                fontWeight: 500,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              }}
            >
              10-figure challenge
            </div>
            <div className="text-sm leading-snug text-(--color-body)">
              The competitive run. Starts easy and climbs as you answer correctly. One score per run, posted to the leaderboard.
            </div>
            <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
              10 rounds · adaptive · today + all-time leaderboards
            </div>
          </span>
          <span className="self-center font-display text-base italic text-(--color-amber) opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            start →
          </span>
        </button>

        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
          § Practice
        </div>
        <p className="mb-5 text-sm text-(--color-muted)">
          Open-ended rounds at a fixed difficulty. No leaderboard — your own score keeps building.
        </p>

        <div className="flex flex-col gap-3">
          {PRACTICE_DIFFICULTIES.map((d) => {
            const count = counts[d.key];
            const selected = d.key === current;
            return (
              <button
                key={d.key}
                onClick={() => startPractice(d.key)}
                className={
                  'group flex items-start gap-5 rounded-card border bg-white px-6 py-5 text-left transition-colors duration-150 ' +
                  (selected
                    ? 'border-(--color-amber) bg-(--color-amber-soft)/40'
                    : 'border-(--color-hairline) hover:border-(--color-hairline-strong) hover:bg-(--color-paper)')
                }
              >
                <span className="flex-1">
                  <span className="block font-display text-xl font-medium text-(--color-ink)">
                    {d.label}
                    {selected && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-amber)">
                        last used
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-(--color-muted)">
                    {d.blurb}
                  </span>
                  <span className="mt-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
                    {loading ? '…' : count} figures in the pool
                  </span>
                </span>
                <span className="self-center font-display text-sm italic text-(--color-amber) opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  start →
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
