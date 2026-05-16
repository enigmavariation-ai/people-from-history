import { loadString, saveString } from '@/lib/storage';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty } from '@/types/figure';

type PlaySetupProps = { goTo: (s: Screen) => void };

const PRACTICE_DIFFICULTIES: ReadonlyArray<{ key: Difficulty; label: string }> = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

function currentDifficulty(): Difficulty {
  const v = loadString('difficulty');
  if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  return 'easy';
}

function loadLastRunTotal(): number | null {
  const raw = loadString('challenge:lastRun');
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'total' in parsed &&
      typeof (parsed as { total: unknown }).total === 'number'
    ) {
      return (parsed as { total: number }).total;
    }
    return null;
  } catch {
    return null;
  }
}

export function PlaySetup({ goTo }: PlaySetupProps) {
  const { figures, loading } = useFigures();
  const current = currentDifficulty();
  const lastRunTotal = loadLastRunTotal();

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
      <div className="mx-auto max-w-[720px] px-6 pb-24 pt-10">
        <div className="mb-8">
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

        <h1
          className="mb-10"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            textWrap: 'balance',
          }}
        >
          What's it going to be?
        </h1>

        {/* 01 · CHALLENGE */}
        <SectionMark>01 · Challenge</SectionMark>
        <button
          onClick={startChallenge}
          className="pfh-navy group mb-12 block w-full rounded-panel px-7 py-7 text-left transition-[filter,transform] duration-200 hover:translate-x-0.5 hover:brightness-115 active:brightness-95"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-(--color-gold)">
              10 rounds · adaptive
            </span>
            {lastRunTotal !== null && (
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-on-navy-muted)">
                Last: {lastRunTotal} pts
              </span>
            )}
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              lineHeight: 1.05,
              fontWeight: 500,
              letterSpacing: '-0.015em',
              color: 'var(--color-on-navy)',
            }}
          >
            Climb the <em className="font-normal italic text-(--color-gold)">leaderboard</em>.
          </h2>
          <div className="mt-5 inline-flex items-center gap-2 font-display text-base italic text-(--color-gold) transition-all duration-200 group-hover:gap-3">
            Start
            <span>→</span>
          </div>
        </button>

        {/* 02 · PRACTICE */}
        <SectionMark>02 · Practice</SectionMark>
        <p className="mb-4 text-sm text-(--color-muted)">
          Pick a tier and play as long as you want. No leaderboard.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {PRACTICE_DIFFICULTIES.map((d) => {
            const count = counts[d.key];
            const selected = d.key === current;
            return (
              <button
                key={d.key}
                onClick={() => startPractice(d.key)}
                className={
                  'group flex flex-col items-start gap-1 rounded-card border bg-white px-4 py-4 text-left transition-colors duration-150 ' +
                  (selected
                    ? 'border-(--color-amber) bg-(--color-amber-soft)/40'
                    : 'border-(--color-hairline) hover:border-(--color-hairline-strong) hover:bg-(--color-paper)')
                }
              >
                <span className="flex w-full items-baseline justify-between">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 500,
                      color: 'var(--color-ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {d.label}
                  </span>
                  <TierMark difficulty={d.key} />
                </span>
                <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
                  {loading ? '…' : `${count} figures`}
                </span>
                {selected && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-(--color-amber)">
                    last played
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectionMark({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
      {children}
    </div>
  );
}

// Simple chevron indicator for tier — 1/2/3 stacked dots.
function TierMark({ difficulty }: { difficulty: Difficulty }) {
  const count = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  return (
    <span className="inline-flex items-end gap-0.5 pb-0.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden
          className="block w-1 rounded-sm"
          style={{
            height: n === 1 ? 5 : n === 2 ? 8 : 11,
            background: n <= count ? 'var(--color-amber)' : 'var(--color-hairline)',
          }}
        />
      ))}
    </span>
  );
}
