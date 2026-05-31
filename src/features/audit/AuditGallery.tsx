import { useMemo, useState } from 'react';

import { AppMenu } from '@/components/AppMenu';
import { FigureEditor } from '@/features/audit/FigureEditor';
import { isAdmin } from '@/lib/auth';
import { useAuth } from '@/lib/useAuth';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty, Figure } from '@/types/figure';

type AuditGalleryProps = { goTo: (s: Screen) => void };

type FilterMode = 'all' | 'easy' | 'medium' | 'hard';

// Internal audit tool. Renders every playable figure with its full
// portrait on the left and the start-size focal crop on the right,
// so we can scan for: (a) bad lead images (statues, group photos,
// non-portraits), (b) focal coords that miss the face, (c) start_size
// too tight or too loose. Read-only — fixes happen in Supabase or via
// a script. Not exposed in regular navigation.
export function AuditGallery({ goTo }: AuditGalleryProps) {
  const { figures, loading, error } = useFigures();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [editing, setEditing] = useState<Figure | null>(null);
  // Local override map so saves reflect immediately without refetching
  // the figures list. Keyed by id.
  const [overrides, setOverrides] = useState<
    Record<string, Pick<Figure, 'focal_x' | 'focal_y' | 'start_size'>>
  >({});

  const admin = isAdmin(user);

  const merged = useMemo(
    () =>
      figures.map((f) => (overrides[f.id] ? { ...f, ...overrides[f.id] } : f)),
    [figures, overrides],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return merged;
    return merged.filter((f) => f.difficulty === filter);
  }, [merged, filter]);

  const counts = useMemo(() => {
    const c: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const f of figures) c[f.difficulty]++;
    return c;
  }, [figures]);

  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-6 md:px-10 md:pt-10">
        <div className="mb-6">
          <AppMenu goTo={goTo} currentScreen="audit" />
        </div>

        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
          § Internal · audit
        </div>
        <h1
          className="mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(26px, 5vw, 36px)',
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.015em',
          }}
        >
          Figure gallery
        </h1>
        <p className="mb-3 text-sm text-(--color-muted)">
          Every playable figure with its full portrait and start-size crop.
          Use this to spot wrong lead images and misplaced focal points.
        </p>
        {admin ? (
          <p className="mb-5 text-xs text-(--color-amber)">
            ◆ Admin mode — click a card to edit its focal point.
          </p>
        ) : (
          <p className="mb-5 text-xs text-(--color-muted)">
            Read-only. Sign in as an admin to edit.
          </p>
        )}

        <div className="mb-6 flex flex-wrap gap-1.5">
          {(
            [
              { key: 'all', label: `All (${figures.length})` },
              { key: 'easy', label: `Easy (${counts.easy})` },
              { key: 'medium', label: `Medium (${counts.medium})` },
              { key: 'hard', label: `Hard (${counts.hard})` },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={
                'rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors duration-150 ' +
                (filter === opt.key
                  ? 'border-(--color-ink) bg-(--color-ink) text-white'
                  : 'border-(--color-hairline) bg-white text-(--color-body) hover:bg-black/[0.03]')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="rounded-card border border-(--color-hairline) bg-white px-4 py-6 text-center text-sm text-(--color-muted)">
            Loading…
          </div>
        )}
        {error && (
          <div className="rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
            {error.message}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((f) => (
              <AuditCard
                key={f.id}
                figure={f}
                editable={admin}
                onClick={admin ? () => setEditing(f) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <FigureEditor
          figure={editing}
          onClose={() => setEditing(null)}
          onSaved={(next) =>
            setOverrides((prev) => ({ ...prev, [editing.id]: next }))
          }
        />
      )}
    </div>
  );
}

function AuditCard({
  figure,
  editable,
  onClick,
}: {
  figure: Figure;
  editable: boolean;
  onClick?: () => void;
}) {
  if (!figure.image_url) return null;
  const startBox = figure.start_size * 100;
  const half = startBox / 2;
  const left = figure.focal_x * 100 - half;
  const top = figure.focal_y * 100 - half;
  const Wrapper = editable ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      type={editable ? 'button' : undefined}
      className={
        'overflow-hidden rounded-card border border-(--color-hairline) bg-white text-left transition-colors duration-150 ' +
        (editable ? 'hover:border-(--color-amber) cursor-pointer' : '')
      }
    >
      <div className="relative aspect-square w-full overflow-hidden bg-(--color-paper)">
        <img
          src={figure.image_url}
          alt={figure.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          // Same anchoring as the in-game CropStage so the focal box
          // outline lines up with the actual focal point in the
          // displayed crop.
          style={{
            objectPosition: `${figure.focal_x * 100}% ${figure.focal_y * 100}%`,
          }}
          draggable={false}
        />
        {/* Focal box outline — amber rectangle showing what players see first. */}
        <div
          aria-hidden
          className="pointer-events-none absolute border-2 border-(--color-amber)"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${startBox}%`,
            height: `${startBox}%`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.5)',
          }}
        />
        {/* Difficulty pill */}
        <div className="absolute right-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-(--color-body) shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
          {figure.difficulty[0]}
        </div>
      </div>
      <div className="px-2.5 py-2">
        <div
          className="truncate text-[13px]"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            color: 'var(--color-ink)',
          }}
        >
          {figure.name}
        </div>
        <div className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
          {figure.id}
        </div>
      </div>
    </Wrapper>
  );
}
