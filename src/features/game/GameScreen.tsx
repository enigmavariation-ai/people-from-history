import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppMenu } from '@/components/AppMenu';
import { Coachmarks } from '@/components/Coachmarks';
import { GuessInput } from '@/components/GuessInput';
import { WinCelebration } from '@/components/WinCelebration';
import { sampleFigure } from '@/data/sampleFigure';
import { CropStage } from '@/features/game/CropStage';
import { isPermanent } from '@/lib/auth';
import { getRecentIds, markShown } from '@/lib/figureCooldown';
import { pickRoundFocal } from '@/lib/focalPicker';
import { MAX_GUESSES_PER_ROUND } from '@/lib/gameRules';
import { matches } from '@/lib/matching';
import {
  loadNumber,
  loadString,
  loadStringSet,
  saveNumber,
  saveString,
  saveStringSet,
} from '@/lib/storage';
import { pushPracticeState } from '@/lib/syncState';
import { useAuth } from '@/lib/useAuth';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty, Figure } from '@/types/figure';
import type { HintType } from '@/types/hint';

type GameScreenProps = { goTo: (s: Screen) => void };

type Feedback = {
  kind: 'neutral' | 'success' | 'error' | 'reveal';
  text: string;
  sub?: string;
};

type Outcome = 'playing' | 'won' | 'lost';

const HINTS: ReadonlyArray<{ key: HintType; name: string; cost: number; icon: string }> = [
  { key: 'era', name: 'Era', cost: 5, icon: 'E' },
  { key: 'field', name: 'Field', cost: 10, icon: 'F' },
  { key: 'region', name: 'Region', cost: 10, icon: 'R' },
  { key: 'letter', name: 'Initial', cost: 15, icon: 'A' },
];

const NEUTRAL_FEEDBACK: Feedback = {
  kind: 'neutral',
  text: 'Start with a tight crop for max points.',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

function loadDifficulty(): Difficulty {
  const v = loadString('difficulty');
  if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  return 'easy';
}

function hintValue(figure: Figure, key: HintType): string {
  switch (key) {
    case 'era':
      return figure.era;
    case 'field':
      return figure.field;
    case 'region':
      return figure.region;
    case 'letter':
      return figure.first_letter;
  }
}

function pickRandom<T>(pool: T[]): T | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function selectNextFigure(
  pool: Figure[],
  difficulty: Difficulty,
  seen: Set<string>,
  excludeId: string | null,
  cooldown: ReadonlySet<string>,
): Figure | null {
  const sameTier = pool.filter((f) => f.difficulty === difficulty);
  // Preferred: not in seen, not in cooldown, not the just-shown
  // figure. Then fall back step by step.
  const freshest = sameTier.filter(
    (f) => !seen.has(f.id) && !cooldown.has(f.id) && f.id !== excludeId,
  );
  if (freshest.length > 0) return pickRandom(freshest);
  const unseenIgnoringCooldown = sameTier.filter(
    (f) => !seen.has(f.id) && f.id !== excludeId,
  );
  if (unseenIgnoringCooldown.length > 0) return pickRandom(unseenIgnoringCooldown);
  const sameDiff = sameTier.filter((f) => f.id !== excludeId);
  if (sameDiff.length > 0) return pickRandom(sameDiff);
  const anyOther = pool.filter((f) => f.id !== excludeId);
  if (anyOther.length > 0) return pickRandom(anyOther);
  return pickRandom(pool);
}

export function GameScreen({ goTo }: GameScreenProps) {
  const { figures, loading, error } = useFigures();
  const { user, loading: authLoading } = useAuth();

  // Practice is gated to signed-up users — the stats it tracks
  // (streak, figures-seen, tier preference) only make sense when
  // synced across devices. Anon visitors hitting /game directly get
  // bounced to the login screen.
  useEffect(() => {
    if (!authLoading && !isPermanent(user)) {
      goTo('login');
    }
  }, [authLoading, user, goTo]);

  const [difficulty] = useState<Difficulty>(loadDifficulty);
  const [figure, setFigure] = useState<Figure | null>(null);
  const [reveal, setReveal] = useState(10);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(NEUTRAL_FEEDBACK);
  const [usedHints, setUsedHints] = useState<HintType[]>([]);
  const [streak, setStreak] = useState(() => loadNumber('streak', 0));
  const [round, setRound] = useState(() => loadNumber('round', 0));
  const [seenIds, setSeenIds] = useState<Set<string>>(() => loadStringSet('seen'));
  const [outcome, setOutcome] = useState<Outcome>('playing');
  const [pulse, setPulse] = useState(false);
  const [guessesUsed, setGuessesUsed] = useState(0);

  const pickFigure = useCallback(() => {
    const next = selectNextFigure(
      figures,
      difficulty,
      seenIds,
      figure?.id ?? null,
      getRecentIds(),
    );
    if (!next) return;
    setFigure(next);
    markShown(next.id);
    setReveal(10);
    setGuess('');
    setFeedback(NEUTRAL_FEEDBACK);
    setUsedHints([]);
    setOutcome('playing');
    setGuessesUsed(0);
    setRound((r) => {
      const nextRound = r + 1;
      saveNumber('round', nextRound);
      return nextRound;
    });
  }, [figures, difficulty, seenIds, figure?.id]);

  useEffect(() => {
    if (!figure && figures.length > 0) {
      pickFigure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figures]);

  const markSeen = (id: string) => {
    setSeenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      if (next.size >= figures.length && figures.length > 0) {
        saveStringSet('seen', new Set());
        return new Set();
      }
      saveStringSet('seen', next);
      return next;
    });
  };

  const submitGuess = (raw: string) => {
    if (!figure || outcome !== 'playing') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (matches(trimmed, [figure.name, ...figure.aliases])) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      saveNumber('streak', nextStreak);
      setOutcome('won');
      setFeedback({
        kind: 'success',
        text: `That's ${figure.name}.`,
      });
      markSeen(figure.id);
      setPulse(true);
      setTimeout(() => setPulse(false), 1300);
      pushPracticeState();
      return;
    }

    const next = guessesUsed + 1;
    setGuessesUsed(next);
    setStreak(0);
    saveNumber('streak', 0);
    if (next >= MAX_GUESSES_PER_ROUND) {
      setOutcome('lost');
      const metaParts = [figure.era, figure.field, figure.region].filter(Boolean);
      setFeedback({
        kind: 'reveal',
        text: `Out of guesses — it was ${figure.name}.`,
        sub: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
      });
      markSeen(figure.id);
      pushPracticeState();
    } else {
      setFeedback({
        kind: 'error',
        text: 'Not quite — try revealing more, or use a hint.',
      });
      pushPracticeState();
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    submitGuess(guess);
  };

  const selectSuggestion = (name: string) => {
    setGuess(name);
    submitGuess(name);
  };

  const useHint = (key: HintType) => {
    if (outcome !== 'playing' || !figure) return;
    if (usedHints.includes(key)) return;
    setUsedHints((prev) => [...prev, key]);
  };

  const giveUp = () => {
    if (!figure || outcome !== 'playing') return;
    setStreak(0);
    saveNumber('streak', 0);
    setOutcome('lost');
    const metaParts = [figure.era, figure.field, figure.region].filter(Boolean);
    setFeedback({
      kind: 'reveal',
      text: `It was ${figure.name}.`,
      sub: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
    markSeen(figure.id);
    pushPracticeState();
  };

  const next = () => {
    pickFigure();
  };

  const activeFigure = figure ?? sampleFigure;
  const visualReveal = outcome === 'playing' ? reveal : 100;

  const headerNumeral = useMemo(
    () => `№ ${String(round).padStart(3, '0')}`,
    [round],
  );

  return (
    <RoundChrome
      mode="practice"
      headerNumeral={headerNumeral}
      headerLabel="Practice"
      subtitleLeft={`Round ${round || 1}`}
      hintsUsedCount={usedHints.length}
      difficulty={difficulty}
      onChangeDifficulty={() => goTo('play-setup')}
      goTo={goTo}
      currentScreen="game"
      loading={loading && !figure}
      error={error && !figure ? error : null}
      empty={!loading && !error && figures.length === 0}
      figure={activeFigure}
      reveal={reveal}
      visualReveal={visualReveal}
      onReveal={(v) => {
        if (v > reveal) setReveal(v);
      }}
      potential={0}
      score={0}
      streak={streak}
      outcome={outcome}
      pulse={pulse}
      guess={guess}
      onGuess={setGuess}
      onSubmit={submit}
      onSelectSuggestion={selectSuggestion}
      figurePool={figures}
      feedback={feedback}
      usedHints={usedHints}
      onUseHint={useHint}
      onGiveUp={giveUp}
      onNext={next}
      footMeta={null}
      guessesUsed={guessesUsed}
      guessesMax={MAX_GUESSES_PER_ROUND}
      practiceProgress={{ seen: seenIds.size, total: figures.length }}
    />
  );
}

// =========================================================================
// Round chrome — shared layout for Practice and Challenge. The container is
// single-column on mobile (≤ md) with stat pills overlaying the stage; on
// desktop it's a two-column grid (stage left, dossier right) per the
// PFH Redesign hand-off.
// =========================================================================

export type RoundChromeProps = {
  mode: 'practice' | 'challenge';
  headerNumeral: string;
  headerLabel: string;
  subtitleLeft: string;
  hintsUsedCount: number;
  difficulty: Difficulty;
  onChangeDifficulty: () => void;
  goTo: (s: Screen) => void;
  currentScreen: Screen;
  loading: boolean;
  error: Error | null;
  empty: boolean;
  figure: Figure;
  reveal: number;
  visualReveal: number;
  onReveal: (v: number) => void;
  potential: number;
  score: number;
  streak: number;
  outcome: Outcome;
  pulse: boolean;
  guess: string;
  onGuess: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  // Called when the user taps a typeahead suggestion. Each screen
  // stages the new guess and runs the matcher against it directly
  // (vs reading from state, which is stale within this tick).
  onSelectSuggestion: (name: string) => void;
  // The figure pool drives the typeahead suggestions. We pass the
  // full set rather than filtering by tier/mode so users never see
  // "oh I'm missing a suggestion" feedback that leaks the round's
  // difficulty range.
  figurePool: Figure[];
  feedback: Feedback;
  usedHints: HintType[];
  onUseHint: (key: HintType) => void;
  onGiveUp: () => void;
  onNext: () => void;
  footMeta: string | null;
  // Wrong-guess counter for this round. Used to render a "N of M
  // guesses" indicator near the input. Independent of `usedHints`.
  guessesUsed: number;
  guessesMax: number;
  // Mode-specific labels and optional slots
  scoreLabel?: string;     // defaults "Score" — Challenge uses "Total"
  streakLabel?: string;    // defaults "Streak"; can be overridden per mode (e.g. Daily uses "Day streak")
  nextLabel?: string;      // defaults "Next figure" — Challenge final round uses "See results"
  topInsert?: React.ReactNode; // optional element rendered below top bar, above body (e.g. ProgressDots)
  // Practice-mode dossier stats (figures seen / total). Only rendered when mode === 'practice'.
  practiceProgress?: { seen: number; total: number };
  // If provided, the focal-rotation pick is deterministic — used by
  // Daily so all players see the same starting crop on a given UTC
  // day. Omit in Practice / Challenge for a random pick per round.
  focalSeed?: number;
};

// Three-step quick walkthrough for first-time players. Runs once per
// device across all modes (Practice / Challenge / Daily) so a new
// user sees the slider, hints, and guess mechanics explained no
// matter where they enter. Suppressed by a localStorage flag after
// the first dismissal or completion.
const ROUND_COACHMARKS = [
  {
    eyebrow: 'Step 1 of 3',
    headline: 'Drag the slider to reveal more of the portrait.',
    body: 'Start with the tightest crop. Each percent you uncover costs a point — so guess as early as you can.',
  },
  {
    eyebrow: 'Step 2 of 3',
    headline: 'Stuck? Tap a hint.',
    body: 'Era, Field, Region, and Initial each reveal a clue. In Challenge they cost points; in Practice and Daily they’re free.',
  },
  {
    eyebrow: 'Step 3 of 3',
    headline: 'Type a guess and hit return.',
    body: 'Spelling doesn’t have to be perfect — last names usually work.',
  },
];

export function RoundChrome(props: RoundChromeProps) {
  const {
    mode,
    loading,
    error,
    empty,
    figure,
    visualReveal,
    potential,
    score,
    streak,
    pulse,
    outcome,
    onGiveUp,
    onNext,
    scoreLabel = 'Score',
    streakLabel = 'Streak',
    nextLabel = 'Next figure',
    topInsert,
    focalSeed,
  } = props;
  const isPractice = mode === 'practice';
  // Pick a focal once per figure (deterministic if focalSeed is set,
  // random otherwise). Memoising on figure.id keeps the pick stable
  // through reveals and the win celebration; the next round mounts
  // a different figure and the memo recomputes.
  const roundFocal = useMemo(
    () => pickRoundFocal(figure, focalSeed),
    [figure.id, figure.focal_x, figure.focal_y, figure.start_size, focalSeed],
  );
  // The win pulse is set true briefly after every correct guess. A
  // streak milestone is one of those wins where the streak just
  // crossed into "noteworthy" territory (≥ 2). We use a key trick
  // (streak as the key) downstream so the CSS animation re-runs on
  // each milestone increment.
  const streakMilestone = pulse && streak >= 2;
  const streakKey = `streak-${streak}`;

  const stageContent = loading ? (
    <LoadingPlaceholder />
  ) : error ? (
    <ErrorPlaceholder error={error} />
  ) : empty ? (
    <EmptyPlaceholder />
  ) : (
    <div className="relative">
      {/* Win halo — amber radial glow that fades in/out behind the
          stage on a correct guess. `key={pulse}` re-mounts the
          element so the animation restarts on each new win. */}
      {pulse && (
        <div
          key={`halo-${pulse}`}
          aria-hidden
          className="pfh-halo pointer-events-none absolute -inset-6 z-0"
        />
      )}
      <CropStage
        key={figure.id}
        imageUrl={figure.image_url ?? sampleFigure.image_url}
        focal={{ x: roundFocal.x, y: roundFocal.y }}
        startSize={roundFocal.startSize}
        revealPct={visualReveal}
      />
      {/* Mobile-only pill overlays. Practice hides the score-side pills
          since Practice mode doesn't track points. */}
      <div className="absolute left-3 top-3 md:hidden">
        <PillStat label="Revealed" value={`${visualReveal}%`} />
      </div>
      {!isPractice && (
        <div className="absolute right-3 top-3 md:hidden">
          <PillStat label="Potential" value={String(potential)} tone="ink" />
        </div>
      )}
      <div className="absolute bottom-3 left-3 md:hidden">
        {isPractice ? (
          <PillStat
            key={streakKey}
            label={streakLabel}
            value={String(streak)}
            tone="amber"
            pulse={pulse}
            streakHalo={streakMilestone}
            streakActive={streak >= 2}
          />
        ) : (
          <PillStat
            key={streakKey}
            label={scoreLabel}
            value={String(score)}
            tone="amber"
            extra={`· ${streakLabel} ${streak}`}
            pulse={pulse}
            streakHalo={streakMilestone}
            streakActive={streak >= 2}
          />
        )}
      </div>
      {/* Mobile-only primary action — mirrors the score pill on the
          right edge of the stage so players can give up or advance
          without scrolling past the slider, hints, and guess box.
          Sized to match the PillStat on the left: same padding,
          radius, and display-serif at 14px for visual parity. */}
      <div className="absolute bottom-3 right-3 md:hidden">
        {outcome === 'playing' ? (
          <button
            onClick={onGiveUp}
            disabled={!figure}
            className="inline-flex items-center rounded-full border border-(--color-hairline-strong) bg-white/95 px-3 py-1.5 backdrop-blur-sm transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-body)',
              letterSpacing: '-0.01em',
            }}
          >
            Give up
          </button>
        ) : (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-1.5 rounded-full border border-(--color-amber) bg-(--color-amber) px-3 py-1.5 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            {nextLabel}
            <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
              →
            </span>
          </button>
        )}
      </div>
    </div>
  );

  // Coachmarks render at the root so they overlay both trees, and
  // only appear after at least one figure has loaded (so the
  // walkthrough never floats over a loading spinner).
  const showCoachmarks = !loading && !error && !empty;

  // Win celebration — center-screen phrase + points whenever pulse
  // flips. Practice has no scoring, so we pass null and the points
  // line is omitted. `trigger` is the figure id so a new round
  // restarts the animation cleanly.
  const pointsLabel =
    isPractice || props.potential <= 0 ? null : `+${props.potential} points`;

  return (
    <>
      {/* Modal Coachmarks remain on desktop where the action area
          has the room. Mobile uses the in-context tooltips inside
          MobileTree (anchored to the slider and input directly). */}
      {showCoachmarks && (
        <div className="hidden md:contents">
          <Coachmarks steps={ROUND_COACHMARKS} storageKey="onboarding:rounds" />
        </div>
      )}
      {pulse && (
        <WinCelebration
          trigger={figure?.id ?? 'win'}
          pointsLabel={pointsLabel}
          streak={streak}
          figureName={figure?.name}
          figureMeta={figure
            ? [figure.era, figure.field, figure.region].filter(Boolean).join(' · ')
            : undefined}
        />
      )}
      <MobileTree {...props} stageContent={stageContent} />
      <DesktopTree
        {...props}
        scoreLabel={scoreLabel}
        streakLabel={streakLabel}
        nextLabel={nextLabel}
        topInsert={topInsert}
        stageContent={stageContent}
      />
    </>
  );
}

// =========================================================================
// Mobile (≤ md) — no-scroll flex column. Stage takes remaining space;
// guess input + give-up dock at the bottom; hints compact to pill chips.
// =========================================================================

function MobileTree(
  props: RoundChromeProps & { stageContent: React.ReactNode },
) {
  const {
    mode,
    headerNumeral,
    headerLabel,
    difficulty,
    onChangeDifficulty,
    goTo,
    currentScreen,
    figure,
    reveal,
    visualReveal,
    onReveal,
    outcome,
    guess,
    onGuess,
    onSubmit,
    feedback,
    usedHints,
    onUseHint,
    footMeta,
    guessesUsed,
    guessesMax,
    onSelectSuggestion,
    figurePool,
    topInsert,
    stageContent,
  } = props;
  const isPractice = mode === 'practice';
  const guessesLeft = Math.max(0, guessesMax - guessesUsed);

  // In-context onboarding for first-time mobile players. Three
  // sequential tooltips, each anchored to the relevant control
  // and auto-advanced by the matching user action:
  //   1. "slider" — above the reveal slider, with a pulsing thumb.
  //                 First drag advances.
  //   2. "hints"  — above the hint chip row. First hint tap
  //                 advances; typing into the input skips ahead.
  //   3. "input"  — above the guess input. First character typed,
  //                 first suggestion tap, or first Enter/Guess
  //                 press finishes.
  // × on any tooltip skips the whole flow. Storage marks both the
  // mobile-v1 key and the legacy 'onboarding:rounds' key as seen,
  // so a later desktop visit doesn't re-prompt with the modal.
  const [onbStep, setOnbStep] = useState<
    'init' | 'slider' | 'hints' | 'input' | 'done'
  >('init');
  useEffect(() => {
    // Either flag counts as "user has seen onboarding once". Stops
    // a desktop-first user from seeing the mobile tooltips later
    // when they pick the phone up.
    const seenMobile = loadString('onboarding:mobile-v1');
    const seenDesktop = loadString('onboarding:rounds');
    setOnbStep(seenMobile || seenDesktop ? 'done' : 'slider');
  }, []);
  const completeOnboarding = () => {
    setOnbStep('done');
    saveString('onboarding:mobile-v1', '1');
    // Also mark the desktop modal flow as seen so a user who
    // completes mobile onboarding doesn't then face the desktop
    // modal if they revisit on a wider viewport. Symmetric the
    // other way: dismissing the desktop modal won't re-show the
    // mobile tooltips because we check the mobile key first.
    saveString('onboarding:rounds', '1');
  };
  const handleReveal = (v: number) => {
    if (onbStep === 'slider' && v > reveal) setOnbStep('hints');
    onReveal(v);
  };
  const handleUseHint = (key: HintType) => {
    if (onbStep === 'hints') setOnbStep('input');
    onUseHint(key);
  };
  const handleGuess = (v: string) => {
    // Typing skips any remaining tooltips — the player has clearly
    // figured out the input on their own.
    if (
      (onbStep === 'hints' || onbStep === 'input') &&
      v.length > 0
    ) {
      completeOnboarding();
    }
    onGuess(v);
  };
  const handleSubmit = (e: React.FormEvent) => {
    if (onbStep !== 'done' && onbStep !== 'init') completeOnboarding();
    onSubmit(e);
  };
  const handleSelectSuggestion = (name: string) => {
    if (onbStep !== 'done' && onbStep !== 'init') completeOnboarding();
    onSelectSuggestion(name);
  };

  return (
    <div className="flex h-[calc(100svh-var(--app-bar-h))] flex-col bg-(--color-bg) md:hidden">
      {/* Top bar */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-(--color-rule) px-4 py-2.5">
        <AppMenu goTo={goTo} currentScreen={currentScreen} />
        <div className="inline-flex gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
          <span>{headerNumeral}</span>
          <span>·</span>
          <span>{headerLabel}</span>
        </div>
        <button
          onClick={onChangeDifficulty}
          className="inline-flex items-center gap-1 rounded-full border border-(--color-hairline) bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-body)"
        >
          {DIFFICULTY_LABEL[difficulty]}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Optional top insert — Challenge progress dots */}
      {topInsert && (
        <div className="flex-shrink-0 border-b border-(--color-rule) px-4 py-2">
          {topInsert}
        </div>
      )}

      {/* Stage — natural square at full width */}
      <div className="flex flex-shrink-0 items-center justify-center px-3 pt-3">
        <div className="w-full max-w-[440px]">{stageContent}</div>
      </div>

      {/* Slider (compact) */}
      <div className="relative mt-3 flex flex-shrink-0 items-center gap-3 px-4">
        <input
          type="range"
          className={
            'pfh-slider flex-1' +
            (onbStep === 'slider' ? ' pfh-slider-pulse' : '')
          }
          min={10}
          max={100}
          value={visualReveal}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v > reveal) {
              handleReveal(v);
            } else {
              e.currentTarget.value = String(reveal);
            }
          }}
          disabled={outcome !== 'playing' || !figure}
          aria-label="Reveal amount"
          style={{ ['--reveal-pct' as string]: `${visualReveal}%` }}
        />
        <span
          className="min-w-10 text-right tabular-nums"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}
        >
          {visualReveal}%
        </span>
        {onbStep === 'slider' && (
          <MobileCoachTooltip
            text="Drag to reveal — every % costs a point."
            onDismiss={completeOnboarding}
          />
        )}
      </div>

      {/* Hint chips */}
      <div className="relative flex flex-shrink-0 flex-wrap gap-1.5 px-4 py-2.5">
        {HINTS.map((h) => (
          <MobileHintChip
            key={h.key}
            hint={h}
            value={hintValue(figure, h.key)}
            used={usedHints.includes(h.key)}
            disabled={outcome !== 'playing' || !figure}
            showCost={!isPractice}
            onUse={() => handleUseHint(h.key)}
          />
        ))}
        {onbStep === 'hints' && (
          <MobileCoachTooltip
            text="Stuck? Tap a hint — Era, Field, Region, or Initial."
            onDismiss={completeOnboarding}
          />
        )}
      </div>

      {/* Action area — stacks right under the hints, no bottom anchoring.
          Any leftover viewport height sits below this block. */}
      <div
        className="flex-shrink-0 border-t border-(--color-rule) px-4 pt-3"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {feedback.kind !== 'neutral' && <CompactFeedback feedback={feedback} />}

        <FigureLearnMore figure={figure} outcome={outcome} compact />

        <div className="relative">
          <GuessInput
            value={guess}
            onChange={handleGuess}
            onSubmit={handleSubmit}
            onSelectSuggestion={handleSelectSuggestion}
            disabled={outcome !== 'playing' || !figure}
            figurePool={figurePool}
            suggestionsPosition="above"
            inputClassName="min-h-12 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3 text-base text-(--color-ink) placeholder:text-(--color-muted) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2] disabled:text-(--color-muted)"
            buttonClassName="inline-flex min-h-12 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          {onbStep === 'input' && (
            <MobileCoachTooltip
              text="Type a name — or pick from suggestions."
              onDismiss={completeOnboarding}
            />
          )}
        </div>
        {outcome === 'playing' && (
          <GuessesLeftPill used={guessesUsed} max={guessesMax} left={guessesLeft} />
        )}

        {/* The primary action (Give up / Next) has been moved to a
            pill at the bottom-right of the stage so mobile players
            can advance without scrolling. We keep the meta line —
            currently "X rounds left" in Challenge — anchored here
            since it pairs with the round progress indicators above. */}
        {footMeta && (
          <div className="mt-3 flex items-center justify-end">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
              {footMeta}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileHintChip({
  hint,
  value,
  used,
  disabled,
  showCost,
  onUse,
}: {
  hint: { key: HintType; name: string; cost: number; icon: string };
  value: string;
  used: boolean;
  disabled: boolean;
  showCost: boolean;
  onUse: () => void;
}) {
  return (
    <button
      onClick={onUse}
      disabled={disabled || used}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] transition-colors duration-150 ' +
        (used
          ? 'border-(--color-amber) bg-(--color-amber-soft) text-(--color-amber)'
          : 'border-(--color-hairline) bg-white text-(--color-body)') +
        (disabled && !used ? ' opacity-50' : '')
      }
    >
      <span
        className={
          'inline-grid h-4 w-4 place-items-center rounded text-[9px] font-semibold ' +
          (used ? 'bg-(--color-amber) text-white' : 'bg-(--color-amber-soft) text-(--color-amber)')
        }
      >
        {hint.icon}
      </span>
      {used ? (
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          {value || '—'}
        </span>
      ) : showCost ? (
        <span className="font-mono text-[10px] text-(--color-muted)">−{hint.cost}</span>
      ) : (
        <span className="text-(--color-muted)">{hint.name}</span>
      )}
    </button>
  );
}

function CompactFeedback({ feedback }: { feedback: Feedback }) {
  const classes: Record<Feedback['kind'], string> = {
    neutral: 'border-(--color-hairline) bg-white text-(--color-muted)',
    error: 'border-(--color-error-border) bg-(--color-error-bg) text-(--color-error)',
    success: 'border-(--color-success-border) bg-(--color-success-bg) text-(--color-success)',
    reveal: 'border-(--color-info-border) bg-(--color-info-bg) text-(--color-info)',
  };
  return (
    <div
      className={
        'mb-2.5 rounded-button border px-3 py-2 text-xs leading-[1.4] ' + classes[feedback.kind]
      }
    >
      <div>{feedback.text}</div>
      {feedback.sub && <div className="mt-0.5 opacity-80">{feedback.sub}</div>}
    </div>
  );
}

// =========================================================================
// Desktop (≥ md) — preserves the two-column dossier from the redesign.
// =========================================================================

function DesktopTree(
  props: RoundChromeProps & {
    stageContent: React.ReactNode;
    scoreLabel: string;
    streakLabel: string;
    nextLabel: string;
    topInsert: React.ReactNode;
  },
) {
  const {
    mode,
    headerNumeral,
    headerLabel,
    subtitleLeft,
    hintsUsedCount,
    difficulty,
    onChangeDifficulty,
    goTo,
    currentScreen,
    figure,
    reveal,
    visualReveal,
    onReveal,
    potential,
    score,
    streak,
    outcome,
    pulse,
    guess,
    onGuess,
    onSubmit,
    feedback,
    usedHints,
    onUseHint,
    onGiveUp,
    onNext,
    footMeta,
    guessesUsed,
    guessesMax,
    onSelectSuggestion,
    figurePool,
    scoreLabel,
    streakLabel,
    nextLabel,
    topInsert,
    stageContent,
    practiceProgress,
  } = props;
  const isPractice = mode === 'practice';

  return (
    <div className="hidden h-[calc(100vh-var(--app-bar-h))] flex-col bg-(--color-bg) md:flex">
      <div className="mx-auto flex w-full max-w-[1040px] flex-1 min-h-0 flex-col">
        {/* Top bar */}
        <div className="flex flex-shrink-0 items-center justify-between px-8 pb-3 pt-6">
          <AppMenu goTo={goTo} currentScreen={currentScreen} />
          <div className="inline-flex gap-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
            <span>{headerNumeral}</span>
            <span className="hidden md:inline">·</span>
            <span>{headerLabel}</span>
          </div>
          <button
            onClick={onChangeDifficulty}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-body) hover:text-(--color-ink)"
          >
            {DIFFICULTY_LABEL[difficulty]}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div className="flex-shrink-0 border-t border-(--color-rule)" />

        {topInsert && (
          <div className="flex-shrink-0 px-8 pb-4 pt-4">{topInsert}</div>
        )}

        {/* Body grid */}
        <div className="grid flex-1 min-h-0 grid-cols-[1.25fr_1fr] gap-0">
          {/* Left zone: title + stage + slider. Content anchors to the
              top of the column: title, subtitle, image, slider, caption
              all stack with their natural spacing. The image is capped
              so it never dominates on tall viewports. Any leftover
              vertical space falls at the bottom of the column. */}
          <div className="flex min-h-0 flex-col overflow-y-auto border-r border-(--color-rule) px-8 pb-7 pt-7">
            <h2
              className="flex-shrink-0 leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 500,
                color: 'var(--color-ink)',
                letterSpacing: '-0.015em',
              }}
            >
              People from{' '}
              <em className="font-normal italic text-(--color-amber)">History</em>
            </h2>
            <div className="mt-1.5 flex-shrink-0 text-sm text-(--color-muted)">
              <span className="font-medium text-(--color-ink)">{subtitleLeft}</span>
              {' · '}
              {hintsUsedCount === 0 ? 'No hints used' : `${hintsUsedCount} hint${hintsUsedCount === 1 ? '' : 's'} used`}
            </div>

            {/* Stage — capped so it doesn't dominate. Slider sits
                immediately below with mt-3, no centering tricks. */}
            <div
              className="mt-4 aspect-square w-full self-center"
              style={{ maxWidth: 'min(100%, 60vh)' }}
            >
              {stageContent}
            </div>

            <div
              className="mt-1 grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 self-center"
              style={{ maxWidth: 'min(100%, 60vh)' }}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">Reveal</span>
              <input
                type="range"
                className="pfh-slider"
                min={10}
                max={100}
                value={visualReveal}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v > reveal) {
                    onReveal(v);
                  } else {
                    e.currentTarget.value = String(reveal);
                  }
                }}
                disabled={outcome !== 'playing' || !figure}
                aria-label="Reveal amount"
                style={{ ['--reveal-pct' as string]: `${visualReveal}%` }}
              />
              <span
                className="min-w-12 text-right tabular-nums"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                }}
              >
                {visualReveal}%
              </span>
            </div>
            <div
              className="mt-2 w-full self-center text-xs text-(--color-muted)"
              style={{ maxWidth: 'min(100%, 60vh)' }}
            >
              {isPractice ? (
                <>Drag to see more. <span className="text-(--color-ink)">Tighter crops are sharper practice</span> — no points either way.</>
              ) : (
                <>Drag to see more. <span className="text-(--color-ink)">Each +1% costs 1 point</span> from your potential.</>
              )}
            </div>
          </div>

          {/* Right zone: dossier — scrolls internally if content is taller than row */}
          <div className="min-h-0 overflow-y-auto bg-(--color-paper) px-8 pb-7 pt-7">
            <DossierHeader first>This round</DossierHeader>
            {isPractice ? (
              <div className="mb-6 grid grid-cols-2 gap-2.5">
                <StatTile
                  key={`p-streak-${streak}`}
                  label={streakLabel}
                  value={`${streak}`}
                  pulse={pulse}
                  streakHalo={pulse && streak >= 2}
                  streakActive={streak >= 2}
                  featured
                />
                <StatTile
                  label="Figures seen"
                  value={
                    practiceProgress && practiceProgress.total > 0
                      ? `${practiceProgress.seen} of ${practiceProgress.total}`
                      : `${practiceProgress?.seen ?? 0}`
                  }
                />
              </div>
            ) : (
              <div className="mb-6 grid grid-cols-3 gap-2.5">
                <StatTile label="Score" value={`${potential}`} featured />
                <StatTile label={scoreLabel} value={`${score}`} pulse={pulse} />
                <StatTile
                  key={`c-streak-${streak}`}
                  label={streakLabel}
                  value={`${streak}`}
                  pulse={pulse && streak >= 2}
                  streakHalo={pulse && streak >= 2}
                  streakActive={streak >= 2}
                />
              </div>
            )}

            <DossierHeader>Your guess</DossierHeader>
            <div className="mb-2">
              <GuessInput
                value={guess}
                onChange={onGuess}
                onSubmit={onSubmit}
                onSelectSuggestion={onSelectSuggestion}
                disabled={outcome !== 'playing' || !figure}
                figurePool={figurePool}
                suggestionsPosition="below"
                inputClassName="min-h-12 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3 text-base text-(--color-ink) transition-colors duration-150 placeholder:text-(--color-muted) hover:border-(--color-hairline-strong) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2] disabled:text-(--color-muted) md:min-h-11"
                buttonClassName="inline-flex min-h-12 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) disabled:cursor-not-allowed disabled:opacity-50 md:min-h-11"
              />
            </div>
            {outcome === 'playing' && (
              <div className="mb-4">
                <GuessesLeftPill
                  used={guessesUsed}
                  max={guessesMax}
                  left={Math.max(0, guessesMax - guessesUsed)}
                />
              </div>
            )}

            <FeedbackBox feedback={feedback} />

            <FigureLearnMore figure={figure} outcome={outcome} />

            <div className="mt-5 md:mt-6">
              <div className="mb-2 flex items-baseline justify-between">
                <DossierHeader className="!m-0">Hints</DossierHeader>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
                  tap to unlock
                </span>
              </div>
              <HintsArea
                figure={figure}
                usedHints={usedHints}
                disabled={outcome !== 'playing' || !figure}
                showCost={!isPractice}
                onUse={onUseHint}
              />
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-(--color-rule) pt-4 md:mt-7">
              {outcome === 'playing' ? (
                <button
                  onClick={onGiveUp}
                  disabled={!figure}
                  className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-hairline-strong) bg-transparent px-5 py-2.5 text-sm font-medium text-(--color-body) transition-colors duration-150 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Give up &amp; reveal
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-2.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
                >
                  {nextLabel}
                </button>
              )}
              {footMeta && (
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
                  {footMeta}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== Subcomponents ======================================================

// Duolingo-style row of dots under the guess form. Each filled dot
// is a guess remaining; dots empty out as wrong guesses pile up.
// Cleaner than the previous "N of M used · K left" sentence.
function GuessesLeftPill({
  max,
  left,
}: {
  used: number;
  max: number;
  left: number;
}) {
  const lowWarn = left > 0 && left <= 2;
  const exhausted = left === 0;
  const dotActive = exhausted
    ? 'var(--color-error)'
    : lowWarn
      ? 'var(--color-amber)'
      : 'var(--color-amber)';
  const labelText = exhausted ? 'Out' : `${left} left`;
  const labelTone = exhausted
    ? 'text-(--color-error)'
    : lowWarn
      ? 'text-(--color-amber)'
      : 'text-(--color-muted)';
  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={exhausted ? 'No guesses left' : `${left} of ${max} guesses left`}
    >
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < left;
          return (
            <span
              key={i}
              aria-hidden
              className="block h-2 w-2 rounded-full border"
              style={{
                backgroundColor: filled ? dotActive : 'transparent',
                borderColor: filled ? dotActive : 'var(--color-hairline-strong)',
              }}
            />
          );
        })}
      </div>
      <span
        className={
          'font-mono text-[10px] uppercase tracking-[0.12em] ' + labelTone
        }
      >
        {labelText}
      </span>
    </div>
  );
}

// In-context onboarding tooltip for mobile. Positions itself
// absolutely above its relative parent (the slider row or the
// guess-input wrapper) with a small downward-pointing diamond so
// the eye traces from the message to the actual control. Dismissible
// via a small × in the corner; the host also auto-dismisses on the
// first interaction with the referenced control.
function MobileCoachTooltip({
  text,
  onDismiss,
}: {
  text: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4"
      style={{ bottom: 'calc(100% + 10px)' }}
    >
      <div className="pointer-events-auto relative max-w-[320px] rounded-card border border-(--color-amber) bg-(--color-paper) px-3.5 py-2 pr-7 shadow-[0_6px_22px_-8px_rgba(20,20,25,0.22)]">
        <p
          className="leading-snug"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {text}
        </p>
        <button
          onClick={onDismiss}
          aria-label="Dismiss tip"
          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded text-(--color-muted) hover:bg-black/[0.04] hover:text-(--color-body)"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        {/* Downward diamond pointer — rotated square with two visible
            edges matching the card's amber border. */}
        <div
          aria-hidden
          className="absolute h-2.5 w-2.5 rotate-45 border-b border-r border-(--color-amber) bg-(--color-paper)"
          style={{ left: '50%', bottom: -6, marginLeft: -5 }}
        />
      </div>
    </div>
  );
}

function PillStat({
  label,
  value,
  tone,
  extra,
  pulse,
  streakHalo,
  streakActive,
}: {
  label: string;
  value: string;
  tone?: 'plain' | 'ink' | 'amber';
  extra?: string;
  pulse?: boolean;
  // One-time celebration ring around the entire pill — fired when
  // the player just crossed a streak milestone. See StatTile for
  // notes; mobile pills include score + streak in one container,
  // so the ring celebrates the moment as a whole.
  streakHalo?: boolean;
  // Persistent gold ring while a streak is alive (streak >= 2).
  // Removed on streak reset.
  streakActive?: boolean;
}) {
  const palette =
    tone === 'ink'
      ? 'bg-(--color-ink)/95 text-white border-(--color-ink)'
      : tone === 'amber'
        ? 'bg-(--color-amber-soft)/95 border-(--color-amber-soft-2) text-[#6B4D14]'
        : 'bg-white/95 border-(--color-hairline) text-(--color-body)';
  const labelTone =
    tone === 'ink'
      ? 'text-white/55'
      : tone === 'amber'
        ? 'text-[#8B6519]'
        : 'text-(--color-muted)';
  return (
    <span
      className={
        'inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm ' +
        palette +
        (streakHalo ? ' pfh-streak-halo' : '') +
        (streakActive ? ' pfh-streak-active' : '')
      }
    >
      <span className={'font-mono text-[10px] uppercase tracking-[0.08em] ' + labelTone}>
        {label}
      </span>
      <b
        className={pulse ? 'pfh-pulse' : ''}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {value}
      </b>
      {extra && <span className={'text-[10px] ' + labelTone}>{extra}</span>}
    </span>
  );
}

function DossierHeader({
  children,
  first,
  className,
}: {
  children: React.ReactNode;
  first?: boolean;
  className?: string;
}) {
  return (
    <h3
      className={
        'font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted) ' +
        (first ? 'mb-2.5' : 'mb-2.5 mt-6') +
        (className ? ' ' + className : '')
      }
    >
      {children}
    </h3>
  );
}

function StatTile({
  label,
  value,
  featured,
  pulse,
  streakHalo,
  streakActive,
}: {
  label: string;
  value: string;
  featured?: boolean;
  pulse?: boolean;
  // Stronger one-time celebration — fires when the win pushed the
  // player's streak across the milestone threshold (≥ 2). Pairs a
  // gold expanding-ring on the tile with a color flash on the digit.
  // Re-mounted by changing `key` upstream so the animation restarts.
  streakHalo?: boolean;
  // Persistent gold ring around the tile for the whole time the
  // player is on a streak. Reset removes it.
  streakActive?: boolean;
}) {
  const valueClasses = ['leading-none', 'tabular-nums'];
  if (streakHalo) valueClasses.push('pfh-streak-flash');
  else if (pulse && !featured) valueClasses.push('pfh-pulse');
  return (
    <div
      className={
        'flex items-baseline justify-between gap-2 rounded-card border px-3 py-2 ' +
        (featured
          ? 'border-(--color-ink) bg-(--color-ink) text-white'
          : 'border-(--color-hairline) bg-white') +
        (streakHalo ? ' pfh-streak-halo' : '') +
        (streakActive ? ' pfh-streak-active' : '')
      }
    >
      <span
        className={
          'font-mono text-[10px] uppercase tracking-[0.1em] ' +
          (featured ? 'text-white/60' : 'text-(--color-muted)')
        }
      >
        {label}
      </span>
      <span
        className={valueClasses.join(' ')}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
          color: featured
            ? '#fff'
            : streakHalo
              ? 'var(--color-gold)'
              : pulse
                ? 'var(--color-amber)'
                : 'var(--color-ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function HintsArea({
  figure,
  usedHints,
  disabled,
  showCost,
  onUse,
}: {
  figure: Figure;
  usedHints: HintType[];
  disabled: boolean;
  showCost: boolean;
  onUse: (key: HintType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
      {HINTS.map((h) => {
        const used = usedHints.includes(h.key);
        const value = hintValue(figure, h.key);
        return (
          <button
            key={h.key}
            onClick={() => onUse(h.key)}
            disabled={disabled || used}
            className={
              'group flex w-full items-start gap-3 rounded-card border px-3 py-2.5 text-left transition-colors duration-150 ' +
              (used
                ? 'border-transparent bg-(--color-paper-2) cursor-default'
                : 'border-(--color-hairline) bg-white hover:border-(--color-hairline-strong) ' +
                  (disabled ? ' opacity-50 cursor-not-allowed' : ''))
            }
          >
            <span
              className={
                'grid h-6 w-6 flex-shrink-0 place-items-center rounded text-xs font-semibold ' +
                (used
                  ? 'bg-(--color-ink) text-white'
                  : 'bg-(--color-amber-soft) text-(--color-amber)')
              }
            >
              {h.icon}
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-medium text-(--color-ink)">
                {h.name}
              </span>
              {used ? (
                <span
                  className="mt-0.5 block text-sm italic"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
                >
                  {value || '—'}
                </span>
              ) : showCost ? (
                <span className="mt-0.5 block font-mono text-[10px] tracking-[0.04em] text-(--color-muted)">
                  −{h.cost} pts
                </span>
              ) : (
                <span className="mt-0.5 block font-mono text-[10px] tracking-[0.04em] text-(--color-muted)">
                  tap to reveal
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Wikipedia-backed bio shown after the figure is revealed (win or
// give-up). Collapsed by default — surfaced as a single "About X" row
// that the user expands when they want to read. `compact` tightens
// padding for the mobile dock. `figure.id` keys the state so the
// expansion resets between rounds.
function FigureLearnMore({
  figure,
  outcome,
  compact,
}: {
  figure: Figure;
  outcome: Outcome;
  compact?: boolean;
}) {
  // Desktop has the layout room to auto-expand once the round
  // resolves. Mobile (compact) stays collapsed — expansion there
  // pushes the slider / input around in a fixed-height column —
  // and uses the one-time halo (see `panelKey`) on the collapsed
  // header to draw the eye instead.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(compact ? false : outcome !== 'playing');
  }, [figure.id, outcome, compact]);

  if (outcome === 'playing') return null;
  if (!figure.summary) return null;

  // Re-mount the container whenever the round resolves so the
  // pfh-streak-halo CSS animation re-runs and gold-rings the
  // collapsed About header once. Only used in compact mode.
  const panelKey = compact ? `about-${figure.id}-${outcome}` : undefined;

  return (
    <div
      key={panelKey}
      className={
        'rounded-card border border-(--color-rule) bg-(--color-paper) ' +
        (compact ? 'mb-3 pfh-streak-halo' : 'mt-4')
      }
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={
          'flex w-full items-center justify-between gap-3 text-left ' +
          (compact ? 'px-3 py-2' : 'px-4 py-2.5')
        }
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-amber)">
          About {figure.name}
        </span>
        <span
          aria-hidden
          className={
            'inline-grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-(--color-amber) transition-transform duration-150 ' +
            (expanded ? 'rotate-45' : '')
          }
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>
      {expanded && (
        <div className={compact ? 'px-3 pb-2.5' : 'px-4 pb-3'}>
          <p
            className={
              'text-(--color-body) ' +
              (compact ? 'text-[13px] leading-[1.45]' : 'text-sm leading-[1.5]')
            }
          >
            {figure.summary}
          </p>
          {figure.wikipedia_url && (
            <a
              href={figure.wikipedia_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-(--color-amber) no-underline"
            >
              Learn more on Wikipedia →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackBox({ feedback }: { feedback: Feedback }) {
  const classes: Record<Feedback['kind'], string> = {
    neutral: 'border-(--color-hairline) bg-white text-(--color-muted)',
    error: 'border-(--color-error-border) bg-(--color-error-bg) text-(--color-error)',
    success: 'border-(--color-success-border) bg-(--color-success-bg) text-(--color-success)',
    reveal: 'border-(--color-info-border) bg-(--color-info-bg) text-(--color-info)',
  };
  return (
    <div
      className={
        'flex min-h-12 flex-col justify-center rounded-card border px-4 py-3 text-sm leading-[1.45] transition-colors duration-200 ' +
        classes[feedback.kind]
      }
    >
      <div>{feedback.text}</div>
      {feedback.sub && <div className="mt-1 text-xs opacity-80">{feedback.sub}</div>}
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-card border border-(--color-hairline) bg-(--color-paper) text-center">
      <div className="absolute inset-0 grid place-items-center text-sm text-(--color-muted)">
        Loading figures…
      </div>
    </div>
  );
}

function ErrorPlaceholder({ error }: { error: Error }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-card border border-(--color-error-border) bg-(--color-error-bg) text-center">
      <div className="absolute inset-0 grid place-items-center px-6 text-sm text-(--color-error)">
        Couldn't load figures.
        <br />
        {error.message}
      </div>
    </div>
  );
}

function EmptyPlaceholder() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-card border border-(--color-hairline) bg-(--color-paper) text-center">
      <div className="absolute inset-0 grid place-items-center px-6 text-sm text-(--color-muted)">
        No figures in the database yet. Add one in the Supabase dashboard, then refresh.
      </div>
    </div>
  );
}
