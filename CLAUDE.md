# People from History

A web game where players guess historical figures from progressively-revealed cropped portraits. Tighter crop at the moment of correct guess = higher score.

## Project status

Early development. Building from scratch in Claude Code after prototyping in Lovable. Currently nothing is built — start with the foundation.

## Core concept

A single historical portrait is shown with most of it hidden. Only a small rectangular region — centered on a distinctive feature (Einstein's mustache, Napoleon's bicorne, Frida's unibrow) — is visible at the start. As the player moves a reveal slider, the rectangle expands outward from that focal point. The player tries to identify the figure as early as possible. Scoring rewards tight crops.

## Game modes (build in this order)

1. **10-figure challenge** — the primary competitive mode. Adaptive difficulty: starts on Easy, climbs a tier after 2 consecutive correct (per-streak bump). Give-up drops a tier (Hard → Medium → Easy, stays at Easy) and resets the streak. Hard caps the climb. Score = sum of per-round scores with a difficulty multiplier (Easy ×1, Medium ×1.5, Hard ×2). One score per run, posted to the leaderboard.
2. **Practice (Easy / Medium / Hard)** — open-ended single-player practice at a fixed difficulty. Mechanics identical to the old "endless" mode (round → reveal → guess → score, repeating). No leaderboard; cumulative score persists locally in `localStorage`. No difficulty multiplier — flat `scoreGuess` so personal-best comparisons stay fair.
3. **Daily challenge** — one figure per day, same for everyone, Wordle-style shareable result. Open questions: one attempt vs unlimited tries; share-grid semantics (reveal % buckets vs attempt count).
4. **Async multiplayer** — challenge a friend via shared URL, they play the same 5 figures.
5. **Real-time multiplayer** — live race in a room, timer auto-advances the reveal, first correct gets a bonus.

Build order: ✅ Practice (was endless) → 🚧 Challenge core loop (in progress) → 🚧 Leaderboard (next) → Daily → Async multiplayer → Real-time multiplayer. Do not start on async/real-time multiplayer until challenge + leaderboard + daily are solid.

### Leaderboard scope (challenge mode only)

The 10-figure challenge writes runs to a `runs` Supabase table on completion. Two views: top-10 today, top-10 all-time.

**Identity: anonymous Supabase auth.** Visitors get an opaque `user_id` via `supabase.auth.signInAnonymously()` (no signup, no email, no password — just a cookie-persisted anon session). A `profiles` table stores the chosen nickname per `user_id`; runs reference `user_id` and denormalize the nickname for join-free leaderboard queries. This is the only currently-allowed exception to "no user accounts" — it's the minimum identity for a meaningful leaderboard, with zero UI friction.

**Cross-device sync is not supported yet** — anon users are device-scoped. The upgrade path is a future "claim your profile" flow that converts an anon user to a real account (email magic-link or OAuth via Supabase Auth) without losing the existing `user_id` or run history. That account-upgrade flow is out of scope until we add a paid tier ("save your stats across devices" is the natural pitch).

## Tech stack

- **Vite + React + TypeScript** — keep it strict, no `any`
- **Tailwind CSS** for styling
- **shadcn/ui** for primitive components (Button, Input, Slider, Card, Dialog)
- **Supabase** for figure database, auth (later), and Realtime (for multiplayer)
- **fastest-levenshtein** for fuzzy guess matching
- **Vercel** for hosting (deploy via Git push)

No state management library yet — React state + context is enough until it isn't.

## Folder structure

```
src/
  components/      # Reusable UI components
  features/        # Feature-scoped components (game, daily, multiplayer)
  lib/             # Pure logic: crop math, scoring, guess matching, Supabase client
  pages/           # Route-level components
  data/            # Static data (only if needed; primary source is Supabase)
  types/           # Shared TypeScript types
```

Keep pure logic (`lib/`) separate from React components. Anything that doesn't need React state, props, or effects belongs in `lib/` and gets unit-tested if it's non-trivial.

## Data model

### Figure (Supabase table `figures`)

```ts
type Figure = {
  id: string;               // slug, e.g. "einstein"
  name: string;             // canonical name, e.g. "Albert Einstein"
  aliases: string[];        // alt names for matching, e.g. ["einstein"]
  image_url: string;        // public CDN URL, ideally Wikimedia Commons
  focal_x: number;          // 0-1, normalized horizontal focal point
  focal_y: number;          // 0-1, normalized vertical focal point
  start_size: number;       // 0.10-0.20, side length of starting crop as fraction of image
  focal_note: string;       // curator note: "mustache", "bicorne hat", etc.
  difficulty: 'easy' | 'medium' | 'hard';
  era: string;              // hint: "20th century"
  field: string;            // hint: "Physics"
  region: string;           // hint: "Germany / USA"
  first_letter: string;     // hint: "A"
  enabled: boolean;         // for soft-disabling without deleting
  created_at: string;
};
```

The `image_url` and focal coordinates are the curated parts — they cannot be reliably AI-generated and must be set by a human via the curation tool.

## Crop reveal math

Lives in `src/lib/crop.ts`. The key function:

```ts
function getCropBounds(focal: {x: number, y: number}, startSize: number, revealPct: number) {
  // revealPct goes from 10 to 100
  const t = (revealPct - 10) / 90;  // 0 to 1
  const cropSize = startSize + t * (1 - startSize);  // grows from startSize to 1.0
  const half = cropSize / 2;
  return {
    left: Math.max(0, focal.x - half),
    right: Math.min(1, focal.x + half),
    top: Math.max(0, focal.y - half),
    bottom: Math.min(1, focal.y + half),
  };
}
```

Rendered as a CSS `clip-path: polygon(...)` on an overlay div sitting on top of the image. The polygon goes around the outside of the stage, inward to the rectangle, around the rectangle, and back out. Add `transition: clip-path 0.3s ease` for smoothness. A thin 2px border outlines the visible rectangle.

## Scoring

Lives in `src/lib/scoring.ts`.

```ts
function scoreGuess(revealPct: number, hintsUsed: HintType[]): number {
  const base = Math.max(5, Math.round(100 - revealPct));
  const hintCosts = { era: 5, field: 10, region: 10, letter: 15 };
  const penalty = hintsUsed.reduce((sum, h) => sum + hintCosts[h], 0);
  return Math.max(5, base - penalty);
}
```

In real-time multiplayer, the first correct guess of the round gets a +10 bonus. No hints in multiplayer.

## Guess matching

Lives in `src/lib/matching.ts`. Normalize both guess and target: lowercase, trim, strip punctuation (`.,'-`), collapse whitespace. Match if normalized guess equals any normalized alias exactly, OR Levenshtein distance ≤ 2 against any alias (only for guesses 4+ characters — shorter guesses must match exactly). Use `fastest-levenshtein`.

## Design system

Editorial / museum-plate. Restraint with selective polish — cream parchment, dark navy contrast, burnished amber, classical typography. Sourced from Claude Design hand-off (2026-05-15).

- **Backgrounds**: cream parchment `#F2E9D2` page base; lighter paper `#F8F1DE` and `#EFE5C9` for textured sections; pure white inside cards and inputs floating on top.
- **Text**: ink `#161616` for headings, body `#3D3D3A` for prose, muted `#73726C` for secondary. Hairline rules at `#D9CFB3` (cream sections) or `rgba(22,22,22,0.10)` (general borders).
- **Accents**: burnished amber `#B5822A` (primary brand). Soft amber tints `#F1E1BE` / `#E8CF9A` for active pills and the daily-result squares. Gold `#C99B47` used on dark navy backgrounds.
- **Navy contrast panels**: deep navy `#0E1B33` → `#16243D` with a faint warm radial highlight; rounded 12px, used for the "How it works" section, closing CTA, and footer. Text on navy is `#E7DFCB`; gold is used for headings' italic accent words and small labels.
- **Semantic states**: success `#3B6D11` on `#E7EFD7` with `#97C459` border; error `#A32D2D` on `#FAE1DE` with `#E89A95` border; info `#345E8C` on `#E2EAF2` with `#B7CCE0` border.
- **Typography**:
  - Display: **Newsreader** (Google) for hero, section headings, pull quotes, plate captions, and the daily headline. Italic for accent words like *history*, *works*, *play*, *28%* — italic in amber (or gold on navy).
  - Sans: system stack `-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif` for body, controls, micro labels.
  - Mono: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace` for archival marks like `№ 142 · 15 . V . 2026`, eyebrow labels, share-result preview.
  - Two weights only: 400 regular, 500 medium. No 600 or 700.
  - Sentence case everywhere. Italic — not bold — is the accent. Never ALL CAPS except short tracking-out labels (`A NEW DAILY GAME`, `Plate I · specimen`).
- **Type scale**:
  - Hero h1: 64px display, letter-spacing −0.022em, max-width 520px, balanced. Mobile (≤640px): 44px.
  - Section h2: 40px display, letter-spacing −0.015em. Mobile: 28px.
  - Sub-headline: 20px sans, muted color, max-width 560px. Mobile: 18px.
  - Pull quote: 32px display italic, max-width 720px, balanced. Mobile: 24px.
  - Column number marker: 56px display italic in amber. Mobile: 44px.
  - Column heading: 24px display, weight 500.
  - Body / input: 16px. Small: 14px. Micro: 12px. Archival: 11px mono, tracking 0.08em, uppercase.
- **Editorial details (use sparingly)**: archival mono marks at top of game/daily screens; a single-row ornament (`hairline · amber dot · hairline`) wrapping pull quotes and bracketing the daily result; italic-serif "plate" captions under portraits; corner registration marks on matted portrait frames; circular bust silhouette wordmark; stacked `PEOPLE / FROM / HISTORY` lockup.
- **Borders & radius**: 8px for cards and the portrait stage. 6px for buttons and inputs. 999px (full pill) for hint chips, info pills, the score pill, the floating nav, and the navy "Sign up" button. 4px for the share-preview card and matted portrait frame. 12px for the navy panels themselves.
- **Allowed effects** (selective, deliberate):
  - Faint paper texture (subtle two-layer radial-dot grain) on `.pfh-paper` sections only.
  - Radial-gradient highlights on navy panels (gold-tinted, very low alpha).
  - Backdrop-filter glassmorphism on the floating nav pill: `blur(22px) saturate(180%)` over `rgba(255,255,255,0.42)`, hairline white edge, soft inset top highlight.
  - Subtle drop shadow on primary buttons only: `0 1px 2px rgba(0,0,0,0.05)`.
  - Layered shadows on the glass nav pill (deeper when scrolled).
- **Not allowed**: heavy drop shadows, vivid gradients, scale or rotate transforms on hover, neon, 3D, glow effects, busy textures, bold mid-sentence, ALL CAPS body copy, animations longer than 300ms (slider/clip transitions are 200–300ms; the correct-guess amber pulse on the score number is 1.2s and is the only exception, and uses color only — no movement).
- **Whitespace is generous.** When in doubt, add more padding, not less.
- **Hover**: subtle opacity or background-color shift, 150–200ms. Never movement.
- **Focus**: 2px amber outline at 2px offset.

Restraint is still the goal. The editorial details earn their place by being precise and infrequent — if a flourish is decoration for its own sake, cut it.

## Conventions

- **TypeScript strict mode on.** No `any`. Use `unknown` if you genuinely don't know.
- **Components are functional.** No class components.
- **Named exports** for utilities, **default exports** for page-level route components.
- **Co-locate styles with components** using Tailwind. No CSS-in-JS, no separate CSS files except `index.css` for Tailwind directives and CSS variables.
- **File names**: PascalCase for components (`CropStage.tsx`), camelCase for utilities (`scoring.ts`), kebab-case for routes if using a file-based router.
- **Imports**: external libraries first, then internal absolute imports (`@/lib/...`), then relative imports. One blank line between groups.
- **No unnecessary comments.** Code should be self-explanatory. Comment only the non-obvious: tricky math, business rules, workarounds for external bugs.
- **Errors throw, don't silently fail.** A broken image URL or missing focal point should make noise.

## How to work with me

- **Small, verifiable steps.** Build one feature, verify it works, commit, then move on.
- **Read the diff before accepting.** Catch unintended changes early.
- **Lock down working code.** When I say "the crop rendering is working, don't touch CropStage.tsx," respect that.
- **Verify with the dev server.** After meaningful changes, run `npm run dev` and confirm the page works before declaring done.
- **Commit often.** Use clear messages: "Add daily challenge mode" not "updates."
- **Explain non-obvious choices.** If you pick a library, a pattern, or an approach I might not expect, tell me why in your reply.
- **Ask before adding dependencies.** Don't silently install new packages — flag it first.
- **Don't refactor without being asked.** If you notice something messy while making a different change, mention it but don't fix it in the same commit.

## Image sourcing rules

Images come from Wikimedia Commons unless I say otherwise. Public domain or CC-BY only. Never use copyrighted images, paparazzi shots, modern celebrity photos, or anything where the rights are unclear. The figure must be deceased and historically significant.

For each figure, I (the human) source the image and tag the focal point manually via the curation tool. Do not invent image URLs — they will be wrong. If I haven't provided a URL for a figure yet, mark its `image_url` as null and skip it in the playable game.

## What this game is not

- Not a celebrity guessing game (no living people, no entertainment figures)
- Not an AI image generation game (we use real historical portraits)
- Not a trivia game (no multiple choice in normal mode — text input only)
- Not monetized at launch (no ads, no paywalls — that comes later if the game finds an audience)
- Not heavy on tutorials (the game should be playable in 10 seconds without instructions)

## Out of scope (do not build until I ask)

- User accounts and login → anonymous Supabase auth is allowed for the Challenge leaderboard (`signInAnonymously` only, no signup UI). Real accounts / email / OAuth / password reset stay out of scope until we ship the "claim your profile" upgrade flow as part of a paid tier.
- ~~Leaderboards~~ → in scope for the 10-figure challenge only (today + all-time, top-10 each). Practice mode stays leaderboard-free.
- Themed packs / paid content
- Mobile app (web only for now)
- Analytics integration
- Email signup / marketing automation

## Open questions I'm still deciding

- How many figures to launch with (current target: 40-60 carefully curated, not 200)
- Whether the daily challenge gives one attempt or unlimited tries until correct
- Whether multiplayer rounds have a hard 60s timer or scale with difficulty

Bring these up if they become relevant — don't decide them unilaterally.
