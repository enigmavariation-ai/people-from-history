import { useEffect, useState } from 'react';

import { BrandMark } from '@/components/BrandMark';
import { sampleFigure } from '@/data/sampleFigure';
import { CropStage } from '@/features/game/CropStage';
import { HeroPortrait } from '@/features/landing/HeroPortrait';
import { matches } from '@/lib/matching';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';

type LandingProps = { goTo: (s: Screen) => void };

type DemoFeedback = { kind: 'success' | 'error'; text: string } | null;

export function Landing({ goTo }: LandingProps) {
  const { figures } = useFigures();
  const [scrolled, setScrolled] = useState(false);
  const [demoReveal, setDemoReveal] = useState(15);
  const [demoGuess, setDemoGuess] = useState('');
  const [demoFeedback, setDemoFeedback] = useState<DemoFeedback>(null);

  const demoFigure = figures.find((f) => f.id === 'einstein') ?? sampleFigure;

  useEffect(() => {
    const root = document.getElementById('landing-scroll');
    if (!root) return;
    const onScroll = () => setScrolled(root.scrollTop > 24);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  const submitDemo = (e: React.FormEvent) => {
    e.preventDefault();
    const g = demoGuess.trim();
    if (!g) return;
    if (matches(g, [demoFigure.name, ...demoFigure.aliases])) {
      setDemoFeedback({ kind: 'success', text: `Correct — that's ${demoFigure.name}.` });
    } else {
      setDemoFeedback({ kind: 'error', text: 'Not quite. Try revealing more.' });
    }
  };

  const scrollToDemo = () => {
    const el = document.getElementById('demo-how');
    const root = document.getElementById('landing-scroll');
    if (el && root) root.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
  };

  return (
    <div
      id="landing-scroll"
      className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg) scroll-smooth"
    >
      <div className="pfh-nav-wrap">
        <nav className={'pfh-nav-pill' + (scrolled ? ' scrolled' : '')}>
          <BrandMark onClick={() => goTo('landing')} />
          <div className="pfh-nav-links flex items-center gap-8">
            {[
              { label: 'Play', target: 'play-setup' as const },
              { label: 'How to play', target: null },
              { label: 'Leaderboard', target: 'leaderboard' as const },
              { label: 'About', target: null },
            ].map((l) => (
              <a
                key={l.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (l.target) goTo(l.target);
                }}
                className="text-sm text-(--color-ink) opacity-[0.78] no-underline transition-opacity duration-150 hover:opacity-100"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3.5">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="mr-1 text-sm text-(--color-ink) opacity-[0.78] no-underline transition-opacity duration-150 hover:opacity-100"
            >
              Log in
            </a>
            <button
              onClick={() => goTo('play-setup')}
              className="flex-shrink-0 whitespace-nowrap rounded-full border border-(--color-navy) bg-(--color-navy) px-[22px] py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2D49]"
            >
              Sign up
            </button>
          </div>
        </nav>
      </div>

      {/* Hero */}
      <section className="px-8 pb-20 pt-12">
        <div
          className="pfh-hero-grid mx-auto grid max-w-[1240px] items-center gap-14"
          style={{ gridTemplateColumns: '1.1fr 1fr' }}
        >
          <div>
            <div className="mb-7 text-xs uppercase tracking-[4px] text-(--color-muted)">
              A new daily game
            </div>
            <h1
              className="pfh-hero-h1 mb-7"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 64,
                lineHeight: 1.04,
                fontWeight: 400,
                color: 'var(--color-ink)',
                letterSpacing: '-0.022em',
                maxWidth: 520,
                textWrap: 'balance',
              }}
            >
              Guess the figure from{' '}
              <em className="font-normal italic text-(--color-amber)">history</em>.
            </h1>
            <p className="mb-9 max-w-[480px] text-xl leading-normal text-(--color-muted)">
              Uncover remarkable people from the past. One portrait at a time — start with a glimpse, and reveal more only when you must.
            </p>
            <div className="mb-10 flex flex-wrap gap-3">
              <button
                onClick={() => goTo('play-setup')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button border border-(--color-navy) bg-(--color-navy) px-6 py-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-[#1F2D49]"
              >
                Play today's puzzle →
              </button>
              <button
                onClick={scrollToDemo}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button border border-(--color-amber) bg-transparent px-6 py-3.5 text-sm font-medium text-(--color-amber) transition-colors duration-150 hover:bg-(--color-amber-soft)/30"
              >
                How it works
              </button>
            </div>
            <div className="flex flex-wrap gap-7">
              {[
                { k: '01', label: 'Daily puzzle' },
                { k: '02', label: 'Learn history' },
                { k: '03', label: 'Compete & climb' },
              ].map((f) => (
                <div key={f.k} className="flex items-baseline gap-2">
                  <span className="font-display text-xl italic text-(--color-amber)">{f.k}</span>
                  <span className="text-sm text-(--color-body)">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <HeroPortrait />
        </div>
      </section>

      {/* Live demo */}
      <section
        id="demo-how"
        className="pfh-paper border-y border-(--color-rule) px-8 py-24"
      >
        <div className="mx-auto max-w-[560px] text-center">
          <div className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
            Plate I &nbsp;·&nbsp; specimen
          </div>
          <h2
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
            See how it <em className="font-normal italic text-(--color-amber)">works</em>.
          </h2>
          <p className="mx-auto mb-10 text-lg leading-normal text-(--color-muted)">
            Move the slider to reveal more of the image.
          </p>

          <MattedPortrait>
            <CropStage
              imageUrl={demoFigure.image_url ?? sampleFigure.image_url}
              focal={{ x: demoFigure.focal_x, y: demoFigure.focal_y }}
              startSize={demoFigure.start_size}
              revealPct={demoReveal}
            />
          </MattedPortrait>
          <div className="mb-2 mt-3.5 font-display text-sm italic text-(--color-muted)">
            Anonymous sitter, c. 1947 &nbsp;—&nbsp; gelatin silver print, partially obscured.
          </div>

          <div className="mx-auto mt-6 max-w-[420px]">
            <div className="mb-4 flex items-center gap-3">
              <span className="min-w-14 text-left text-sm text-(--color-muted)">Reveal</span>
              <input
                type="range"
                className="pfh-slider"
                min={10}
                max={100}
                value={demoReveal}
                onChange={(e) => setDemoReveal(parseInt(e.target.value, 10))}
                aria-label="Reveal amount"
              />
              <span className="min-w-10 text-right text-sm tabular-nums text-(--color-muted)">
                {demoReveal}%
              </span>
            </div>

            <form onSubmit={submitDemo} className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Who is this?"
                value={demoGuess}
                onChange={(e) => setDemoGuess(e.target.value)}
                className="min-h-11 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3.5 text-base text-(--color-ink) transition-colors duration-150 placeholder:text-(--color-muted) hover:border-(--color-hairline-strong) focus:border-(--color-amber) focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex min-h-11 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
              >
                Guess
              </button>
            </form>

            {demoFeedback && (
              <div
                className={
                  'pfh-fade mt-4 rounded-card border px-3.5 py-3 text-left text-sm ' +
                  (demoFeedback.kind === 'success'
                    ? 'border-(--color-success-border) bg-(--color-success-bg) text-(--color-success)'
                    : 'border-(--color-error-border) bg-(--color-error-bg) text-(--color-error)')
                }
              >
                {demoFeedback.text}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works (navy panel) */}
      <section className="pfh-navy mx-6 my-0 rounded-panel px-8 py-24">
        <div className="mx-auto max-w-[1040px] text-center">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-gold)">
            How it works
          </div>
          <h2
            className="mx-auto mb-[72px] max-w-[640px]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              lineHeight: 1.1,
              fontWeight: 400,
              letterSpacing: '-0.015em',
              textWrap: 'balance',
            }}
          >
            Simple to play, hard to{' '}
            <em className="font-normal italic text-(--color-gold)">master</em>.
          </h2>

          <div
            className="pfh-steps grid items-start gap-4"
            style={{ gridTemplateColumns: '1fr auto 1fr auto 1fr' }}
          >
            <Step
              n="1"
              icon={<IconReveal />}
              title="Reveal"
              body="We start you with a sliver of the portrait. Expand the crop only when you must."
            />
            <Connector />
            <Step
              n="2"
              icon={<IconGuess />}
              title="Guess"
              body="Type your answer and earn points. Less reveal, more reward."
            />
            <Connector />
            <Step
              n="3"
              icon={<IconClimb />}
              title="Climb"
              body="Build a streak across days, push up the leaderboard, sharpen your eye."
            />
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section className="pfh-paper border-y border-(--color-rule) px-8 py-[140px]">
        <div className="mx-auto max-w-[720px] text-center">
          <div className="pfh-ornament mb-10">
            <div className="rule" />
            <div className="dot" />
            <div className="rule" />
          </div>
          <p
            className="mb-7"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 32,
              lineHeight: 1.32,
              fontWeight: 400,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
              textWrap: 'balance',
            }}
          >
            “It's the kind of game where you'll shout the answer out loud one second and feel like an idiot the next.”
          </p>
          <div className="text-sm italic text-(--color-muted)">— Early tester</div>
          <div className="pfh-ornament mt-10">
            <div className="rule" />
            <div className="dot" />
            <div className="rule" />
          </div>
        </div>
      </section>

      {/* Closing CTA (navy) */}
      <section className="pfh-navy relative mx-6 mt-8 overflow-hidden rounded-panel px-8 py-[120px]">
        <SculptureMotif side="left" />
        <SculptureMotif side="right" />

        <div className="relative mx-auto max-w-[640px] text-center">
          <div className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-gold)">
            § Today
          </div>
          <h2
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              lineHeight: 1.1,
              fontWeight: 400,
              letterSpacing: '-0.015em',
              textWrap: 'balance',
            }}
          >
            Ready to test your{' '}
            <em className="font-normal italic text-(--color-gold)">knowledge</em>?
          </h2>
          <p className="mx-auto mb-9 max-w-[520px] text-lg leading-normal text-(--color-on-navy-muted)">
            Start guessing and discover the stories behind history's most recognizable faces.
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => goTo('play-setup')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
            >
              Play now →
            </button>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-sm text-(--color-gold) no-underline"
            >
              Get notified when multiplayer launches →
            </a>
          </div>
        </div>
      </section>

      {/* Footer (navy) */}
      <footer className="pfh-navy mx-6 mb-6 mt-3 rounded-panel px-8 pb-14 pt-10">
        <div className="mx-auto grid max-w-[1240px] grid-cols-3 items-center gap-4 text-sm text-(--color-on-navy-muted)">
          <BrandMark tone="dark" />
          <div className="flex justify-center gap-7">
            {['Play', 'How to play', 'Leaderboard', 'About'].map((l) => (
              <a
                key={l}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-(--color-on-navy) opacity-85 no-underline"
              >
                {l}
              </a>
            ))}
          </div>
          <div className="flex justify-end gap-4 text-right">
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MattedPortrait({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto rounded p-7"
      style={{
        maxWidth: 476,
        background: '#FBF9F4',
        border: '1px solid var(--color-rule)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04), inset 0 0 0 1px rgba(255,255,255,0.6)',
      }}
    >
      {[
        { top: 8, left: 8, b: '1px 0 0 1px' },
        { top: 8, right: 8, b: '1px 1px 0 0' },
        { bottom: 8, left: 8, b: '0 0 1px 1px' },
        { bottom: 8, right: 8, b: '0 1px 1px 0' },
      ].map((p, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute h-2.5 w-2.5"
          style={{
            borderColor: 'rgba(0,0,0,0.18)',
            borderStyle: 'solid',
            borderWidth: p.b,
            top: p.top,
            bottom: p.bottom,
            left: p.left,
            right: p.right,
          }}
        />
      ))}
      {children}
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="px-2 text-center">
      <div className="relative mx-auto mb-8 grid h-[72px] w-[72px] place-items-center rounded-full border border-[rgba(231,223,203,0.35)]">
        {icon}
        <span
          className="absolute left-1/2 -translate-x-1/2 grid h-6 w-6 place-items-center rounded-full text-xs font-medium leading-none"
          style={{ bottom: -10, background: 'var(--color-gold)', color: 'var(--color-navy)' }}
        >
          {n}
        </span>
      </div>
      <h3
        className="mb-2.5"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--color-on-navy)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      <p className="mx-auto max-w-[260px] text-sm leading-[1.55] text-(--color-on-navy-muted)">
        {body}
      </p>
    </div>
  );
}

function Connector() {
  return (
    <div aria-hidden className="flex h-[72px] items-center pb-8">
      <svg width="56" height="14" viewBox="0 0 56 14" fill="none" style={{ opacity: 0.4 }}>
        <path d="M0 7 H44" stroke="rgba(231,223,203,0.5)" strokeWidth="1" />
        <path
          d="M40 2 L50 7 L40 12"
          stroke="rgba(231,223,203,0.5)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}

function IconReveal() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect x="4" y="4" width="7" height="7" stroke="var(--color-gold)" strokeWidth="1.2" rx="1" />
      <rect x="15" y="4" width="7" height="7" stroke="rgba(231,223,203,0.5)" strokeWidth="1" rx="1" />
      <rect x="4" y="15" width="7" height="7" stroke="rgba(231,223,203,0.5)" strokeWidth="1" rx="1" />
      <rect x="15" y="15" width="7" height="7" stroke="rgba(231,223,203,0.5)" strokeWidth="1" rx="1" />
    </svg>
  );
}

function IconGuess() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="var(--color-gold)" strokeWidth="1.2" />
      <path
        d="M16 16 L21 21"
        stroke="var(--color-gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClimb() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <path
        d="M13 4 L15.2 9.5 L21 10 L16.6 13.8 L18 19.5 L13 16.4 L8 19.5 L9.4 13.8 L5 10 L10.8 9.5 Z"
        stroke="var(--color-gold)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function SculptureMotif({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute opacity-[0.08]"
      style={{
        [side]: -20,
        bottom: -20,
        width: 220,
        height: 220,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 40%, #E7DFCB 0%, transparent 60%)',
      }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <circle cx="50" cy="38" r="14" fill="#E7DFCB" opacity="0.7" />
        <path
          d="M22 90 C 26 64 36 56 50 56 C 64 56 74 64 78 90 Z"
          fill="#E7DFCB"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}
