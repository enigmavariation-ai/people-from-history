import { AppMenu } from '@/components/AppMenu';
import { loadString, saveString } from '@/lib/storage';
import { pushPracticeState } from '@/lib/syncState';
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
    pushPracticeState();
    goTo('game');
  };

  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[720px] px-5 pb-20 pt-5 md:px-6 md:pb-24 md:pt-10">
        <div className="mb-5 md:mb-8">
          <AppMenu goTo={goTo} currentScreen="play-setup" />
        </div>

        <h1
          className="mb-7 md:mb-10"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(26px, 7vw, 36px)',
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            textWrap: 'balance',
          }}
        >
          What's it going to be?
        </h1>

        {/* Challenge has its own AppMenu entry and Landing CTAs, so we
            don't repeat it here on the Practice setup screen. */}

        <SectionMark>01 · Practice</SectionMark>
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
                  'group flex flex-col items-start gap-1 rounded-card border bg-white px-3 py-3 text-left transition-colors duration-150 md:px-4 md:py-4 ' +
                  (selected
                    ? 'border-(--color-amber) bg-(--color-amber-soft)/40'
                    : 'border-(--color-hairline) hover:border-(--color-hairline-strong) hover:bg-(--color-paper)')
                }
              >
                <span className="flex w-full items-baseline justify-between gap-1">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(17px, 4.5vw, 22px)',
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

        {/* CENTURIES — premium-only era packs. Cards are visibly locked
            (lock icon + amber Premium chip) and clicking surfaces the
            upsell. The eras are coarse-grained so each card has 30+
            figures from the existing pool. */}
        <div className="mt-9 md:mt-12">
          <SectionMark>02 · Centuries</SectionMark>
          <p className="mb-4 text-sm text-(--color-muted)">
            Play a single era. <span className="text-(--color-ink)">Premium</span> — coming with the paid tier.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {CENTURIES.map((c) => (
              <CenturyCard key={c.key} century={c} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => alert('Premium centuries are coming with the paid tier.')}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Unlock with Premium
          </button>
        </div>

        {/* THEMED COLLECTIONS — roadmap teaser, separate from the
            premium centuries. These are aspirational and explicitly
            not yet built. */}
        <div className="mt-9 md:mt-12">
          <SectionMark>03 · Themed packs</SectionMark>
          <p className="mb-4 text-sm text-(--color-muted)">
            Curated cross-cuts — coming later.
          </p>

          <div className="grid grid-cols-2 gap-2.5" aria-label="Upcoming themed packs">
            {COLLECTIONS.map((c) => (
              <CollectionCard key={c.key} collection={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Collection = {
  key: string;
  title: string;
  examples: string;
  count: number;
};

const COLLECTIONS: ReadonlyArray<Collection> = [
  { key: 'artists', title: 'Artists', examples: 'Van Gogh, Picasso, Kahlo', count: 24 },
  { key: 'philosophers', title: 'Philosophers', examples: 'Plato, Kant, Nietzsche', count: 18 },
  { key: 'emperors', title: 'Roman Emperors', examples: 'Caesar, Nero, Hadrian', count: 20 },
  { key: 'authors', title: 'Authors', examples: 'Tolstoy, Austen, Hemingway', count: 22 },
];

type Century = {
  key: string;
  title: string;
  examples: string;
};

const CENTURIES: ReadonlyArray<Century> = [
  { key: 'antiquity', title: 'Antiquity', examples: 'Cleopatra, Caesar, Buddha' },
  { key: 'renaissance', title: 'Renaissance & Reformation', examples: 'Da Vinci, Luther, Elizabeth I' },
  { key: 'eighteenth', title: '18th century', examples: 'Mozart, Voltaire, Washington' },
  { key: 'nineteenth', title: '19th century', examples: 'Lincoln, Darwin, Van Gogh' },
  { key: 'twentieth', title: '20th century', examples: 'Einstein, Gandhi, Monroe' },
  { key: 'twentyfirst', title: '21st century', examples: 'Jobs, Hawking, Bowie' },
];

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <div
      aria-label={`${collection.title} — collection coming soon`}
      className="relative overflow-hidden rounded-card border border-dashed border-(--color-hairline-strong) bg-(--color-paper)/60 px-3.5 py-3"
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--color-muted)',
          letterSpacing: '-0.01em',
        }}
      >
        {collection.title}
      </div>
      <div className="mt-0.5 truncate text-[12px] text-(--color-muted)">
        {collection.examples}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-amber)">
        Soon
      </div>
    </div>
  );
}

function CenturyCard({ century }: { century: Century }) {
  return (
    <button
      type="button"
      onClick={() => alert('Premium centuries are coming with the paid tier.')}
      aria-label={`${century.title} — premium collection, locked`}
      className="group relative overflow-hidden rounded-card border border-(--color-hairline) bg-white px-3.5 py-3 text-left transition-colors duration-150 hover:border-(--color-amber)"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="leading-tight"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {century.title}
        </div>
        <span
          aria-hidden
          className="inline-grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-(--color-ink) text-white"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      </div>
      <div className="mt-0.5 truncate text-[12px] text-(--color-muted)">
        {century.examples}
      </div>
      <div className="mt-2 inline-flex rounded-full bg-(--color-amber-soft) px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-(--color-amber)">
        Premium
      </div>
    </button>
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
