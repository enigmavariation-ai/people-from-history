import { useEffect, useMemo, useState } from 'react';

import { RoundChrome } from '@/features/game/GameScreen';
import {
  getDailyFigure,
  getDailyStreak,
  isPlayedToday,
  loadLastDailyPlay,
  saveLastDailyPlay,
  todayIsoDate,
  updateDailyStreak,
} from '@/lib/daily';
import { matches } from '@/lib/matching';
import { scoreGuess } from '@/lib/scoring';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty, Figure } from '@/types/figure';
import type { HintType } from '@/types/hint';

type DailyGameProps = { goTo: (s: Screen) => void };

type Feedback = {
  kind: 'neutral' | 'success' | 'error' | 'reveal';
  text: string;
  sub?: string;
};

type Outcome = 'playing' | 'won' | 'lost';

const NEUTRAL_FEEDBACK: Feedback = {
  kind: 'neutral',
  text: "Start with a tight crop — once you win or give up, today's done.",
};

// Placeholder used while figures load — never visible because the
// RoundChrome's loading/error/empty branches cover those states.
const EMPTY_FIGURE: Figure = {
  id: '__placeholder__',
  name: '',
  aliases: [],
  image_url: null,
  focal_x: 0.5,
  focal_y: 0.4,
  start_size: 0.15,
  focal_note: '',
  difficulty: 'easy',
  era: '',
  field: '',
  region: '',
  first_letter: '',
  enabled: true,
  created_at: new Date(0).toISOString(),
};

export function DailyGame({ goTo }: DailyGameProps) {
  const { figures, loading, error } = useFigures();
  const today = useMemo(() => todayIsoDate(), []);

  // If already played today, hand off to the result screen immediately.
  useEffect(() => {
    if (isPlayedToday()) {
      goTo('daily');
    }
  }, [goTo]);

  const figure = useMemo<Figure | null>(() => {
    if (figures.length === 0) return null;
    return getDailyFigure(new Date(), figures);
  }, [figures]);

  const [reveal, setReveal] = useState(10);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(NEUTRAL_FEEDBACK);
  const [usedHints, setUsedHints] = useState<HintType[]>([]);
  const [outcome, setOutcome] = useState<Outcome>('playing');
  const [pulse, setPulse] = useState(false);

  const visualReveal = outcome === 'playing' ? reveal : 100;
  const potential = scoreGuess(reveal, usedHints);
  const dailyStreak = getDailyStreak();
  const currentScore = outcome === 'won' ? scoreGuess(reveal, usedHints) : 0;
  const figureForChrome = figure ?? EMPTY_FIGURE;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!figure || outcome !== 'playing') return;
    const trimmed = guess.trim();
    if (!trimmed) return;
    if (matches(trimmed, [figure.name, ...figure.aliases])) {
      setOutcome('won');
      setFeedback({
        kind: 'success',
        text: `Correct! That's ${figure.name}.`,
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 1300);
    } else {
      setFeedback({
        kind: 'error',
        text: 'Not quite — try revealing more, or use a hint.',
      });
    }
  };

  const useHint = (key: HintType) => {
    if (outcome !== 'playing' || !figure) return;
    if (usedHints.includes(key)) return;
    setUsedHints((prev) => [...prev, key]);
  };

  const giveUp = () => {
    if (!figure || outcome !== 'playing') return;
    setOutcome('lost');
    const metaParts = [figure.era, figure.field, figure.region].filter(Boolean);
    setFeedback({
      kind: 'reveal',
      text: `It was ${figure.name}.`,
      sub: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  };

  // Wrap up the day's play: persist result, update streak, route to
  // the result screen. Called when the user clicks "See result" after
  // a round resolves.
  const finishAndGoToResult = () => {
    if (!figure || outcome === 'playing') return;
    const won = outcome === 'won';
    const previousPlay = loadLastDailyPlay();
    updateDailyStreak(won, today, previousPlay);
    saveLastDailyPlay({
      date: today,
      won,
      score: won ? scoreGuess(reveal, usedHints) : 0,
      reveal,
      hintsUsed: usedHints,
      figureId: figure.id,
      figureName: figure.name,
    });
    goTo('daily');
  };

  // Friendly header date "May 17 2026" — preferred for daily over the
  // round-number numerals used in Practice/Challenge.
  const headerNumeral = useMemo(() => {
    return new Date()
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      .toUpperCase();
  }, []);

  const figureDifficulty: Difficulty = figure?.difficulty ?? 'easy';

  return (
    <RoundChrome
      mode="practice"
      headerNumeral={headerNumeral}
      headerLabel="Daily"
      subtitleLeft="Today's puzzle"
      hintsUsedCount={usedHints.length}
      difficulty={figureDifficulty}
      // Daily figure is locked — clicking the difficulty pill just
      // takes you home rather than letting you change anything.
      onChangeDifficulty={() => goTo('landing')}
      goHome={() => goTo('landing')}
      loading={loading && !figure}
      error={error && !figure ? error : null}
      empty={!loading && !error && figures.length === 0}
      figure={figureForChrome}
      reveal={reveal}
      visualReveal={visualReveal}
      onReveal={(v) => {
        if (v > reveal) setReveal(v);
      }}
      potential={potential}
      score={currentScore}
      streak={dailyStreak}
      outcome={outcome}
      pulse={pulse}
      guess={guess}
      onGuess={setGuess}
      onSubmit={submit}
      feedback={feedback}
      usedHints={usedHints}
      onUseHint={useHint}
      onGiveUp={giveUp}
      onNext={finishAndGoToResult}
      footMeta={null}
      scoreLabel="Score"
      streakLabel="Day streak"
      nextLabel="See result"
    />
  );
}
