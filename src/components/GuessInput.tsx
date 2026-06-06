import { useMemo, useState } from 'react';

import type { Figure } from '@/types/figure';

// How many characters the user has to type before suggestions appear.
// 2 strikes a balance between "too eager" (1 char → useless 5-item
// list) and "too cautious" (3 chars → still typing).
const MIN_CHARS = 2;
const SUGGESTION_LIMIT = 5;

type Suggestion = {
  figureId: string;
  // The canonical figure name. Typeahead always autofills the
  // canonical name when tapped, even if the user matched an alias —
  // the canonical name is what the matcher will score against most
  // cleanly, and it's what we want to display in the input.
  display: string;
  era?: string;
};

function buildSuggestions(query: string, pool: Figure[]): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < MIN_CHARS) return [];

  // Prefer prefix matches over substring matches. Cap at 5 across
  // both buckets combined.
  const prefix: Suggestion[] = [];
  const partial: Suggestion[] = [];

  for (const f of pool) {
    const names = [f.name, ...(f.aliases ?? [])];
    let kind: 'prefix' | 'partial' | null = null;
    for (const n of names) {
      const low = n.toLowerCase();
      if (low.startsWith(q)) {
        kind = 'prefix';
        break;
      }
      if (kind === null && low.includes(q)) {
        kind = 'partial';
      }
    }
    if (kind === 'prefix') {
      prefix.push({ figureId: f.id, display: f.name, era: f.era });
    } else if (kind === 'partial') {
      partial.push({ figureId: f.id, display: f.name, era: f.era });
    }
    if (prefix.length >= SUGGESTION_LIMIT) break;
  }

  return [...prefix, ...partial].slice(0, SUGGESTION_LIMIT);
}

type GuessInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  // Called when the user taps a suggestion. The screen is expected
  // to both stage the new value (so the input visually fills) and
  // run the matcher against it — see submitGuess() in each screen.
  onSelectSuggestion: (name: string) => void;
  disabled: boolean;
  figurePool: Figure[];
  // Where to render the suggestions list relative to the input.
  // Mobile anchors the input at the bottom of the viewport so we
  // open the list upward; desktop has room to drop down.
  suggestionsPosition: 'above' | 'below';
  inputClassName: string;
  buttonClassName: string;
};

export function GuessInput({
  value,
  onChange,
  onSubmit,
  onSelectSuggestion,
  disabled,
  figurePool,
  suggestionsPosition,
  inputClassName,
  buttonClassName,
}: GuessInputProps) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(
    () => buildSuggestions(value, figurePool),
    [value, figurePool],
  );
  const show = focused && !disabled && suggestions.length > 0;

  return (
    <div className="relative">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Who is this person?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          // Delay blur slightly so a tap on a suggestion fires
          // before the dropdown unmounts. mousedown on the
          // suggestion button also calls preventDefault to keep
          // focus on the input, but on some browsers the input
          // still blurs first.
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          className={inputClassName}
        />
        <button type="submit" disabled={disabled} className={buttonClassName}>
          Guess
        </button>
      </form>
      {show && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 overflow-hidden rounded-card border border-(--color-hairline-strong) bg-white shadow-[0_8px_24px_-8px_rgba(20,20,25,0.22)]"
          style={
            suggestionsPosition === 'above'
              ? { bottom: 'calc(100% + 6px)' }
              : { top: 'calc(100% + 6px)' }
          }
        >
          {suggestions.map((s) => (
            <li key={s.figureId}>
              <button
                type="button"
                // mousedown fires before the input's blur, so the
                // tap registers while the dropdown is still mounted.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectSuggestion(s.display);
                }}
                className="flex w-full items-baseline justify-between gap-3 border-b border-(--color-hairline) px-4 py-2.5 text-left last:border-b-0 hover:bg-(--color-bg)"
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {s.display}
                </span>
                {s.era && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
                    {s.era}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
