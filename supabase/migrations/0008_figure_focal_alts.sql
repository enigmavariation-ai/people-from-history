-- WP-4: Alternative facial focal points per figure.
--
-- The base `focal_x` / `focal_y` / `start_size` remain the primary
-- focal. This column adds extra facial features (the other eye, an
-- ear, a hairline, a lip) that the runtime picker rotates through
-- so the same figure doesn't always start its reveal from the
-- exact same spot — power-user feedback was that after a few
-- rounds you can recognise the starting crop without seeing any
-- of the face.
--
-- Curator-enforced schema (no DB-side validation beyond the type):
--   focal_alts = [
--     { "x": 0.42, "y": 0.31, "start_size": 0.12, "note": "left eye" },
--     { "x": 0.58, "y": 0.32, "start_size": 0.12, "note": "right eye" }
--   ]
-- Each element: x, y ∈ [0,1]; start_size in the usual 0.10–0.20
-- range; optional `note` for editor display only.
--
-- Empty array (the default) means "always use the primary focal" —
-- backwards compatible with every existing row.

alter table public.figures
  add column if not exists focal_alts jsonb not null default '[]'::jsonb;

comment on column public.figures.focal_alts is
  'Alternative facial focal points for game-time crop rotation. Array of { x, y, start_size, note }.';
