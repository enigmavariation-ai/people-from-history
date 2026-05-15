# People from History

A web game where players guess historical figures from progressively-revealed cropped portraits. Tighter crop at the moment of correct guess = higher score.

## Project status

Early development. Building from scratch in Claude Code after prototyping in Lovable. Currently nothing is built — start with the foundation.

## Core concept

A single historical portrait is shown with most of it hidden. Only a small rectangular region — centered on a distinctive feature (Einstein's mustache, Napoleon's bicorne, Frida's unibrow) — is visible at the start. As the player moves a reveal slider, the rectangle expands outward from that focal point. The player tries to identify the figure as early as possible. Scoring rewards tight crops.

## Game modes (build in this order)

1. **Single-player endless** — pick difficulty, get random figures, guess as many as you can
2. **Daily challenge** — one figure per day, same for everyone, Wordle-style shareable result
3. **Async multiplayer** — challenge a friend via shared URL, they play the same 5 figures
4. **Real-time multiplayer** — live race in a room, timer auto-advances the reveal, first correct gets a bonus

Do not start on multiplayer until single-player and daily are solid.

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

Anthropic-adjacent: clean, restrained, confident.

- **Colors**: white background, near-black text (`#1A1A1A` headings, `#3D3D3A` body), secondary gray (`#73726C`), single accent: warm amber `#C97A2C`. Semantic states for feedback (subtle green/red/blue at low saturation).
- **Typography**: system sans-serif. Two weights only: 400 regular, 500 medium. No 600 or 700. Sentence case everywhere — never Title Case, never ALL CAPS.
- **No mid-sentence bolding.** Bold is for headings and labels only.
- **No gradients, no drop shadows except subtle button shadow, no decorative effects.** Flat, clean surfaces.
- **Borders**: hairline at low opacity, `border-radius: 8px` for cards, 6px for buttons.
- **Whitespace is generous.** When in doubt, add more padding, not less.
- **Animations max 300ms.** Nothing should feel slow or showy. Avoid scale transforms on hover — use opacity or background shifts.

Restraint is the design. The visual quietness is what signals quality.

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

- User accounts and login (single-player works fine with localStorage)
- Leaderboards
- Themed packs / paid content
- Mobile app (web only for now)
- Analytics integration
- Email signup / marketing automation

## Open questions I'm still deciding

- How many figures to launch with (current target: 40-60 carefully curated, not 200)
- Whether the daily challenge gives one attempt or unlimited tries until correct
- Whether multiplayer rounds have a hard 60s timer or scale with difficulty

Bring these up if they become relevant — don't decide them unilaterally.
