import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Figure } from '@/types/figure';

type ImgDim = { w: number; h: number };

type FigureEditorProps = {
  figure: Figure;
  onClose: () => void;
  // Called with the updated focal values after a successful save so
  // the audit list can update without refetching.
  onSaved: (next: Pick<Figure, 'focal_x' | 'focal_y' | 'start_size'>) => void;
};

// Per-figure focal-point editor. Drag the amber box on the portrait
// to reposition the reveal; slide the size control to widen / tighten
// the starting crop. The right pane previews exactly what the player
// sees at 10% reveal so it's clear when the box centres the face.
//
// Writes go through the standard Supabase REST endpoint with the
// caller's JWT. RLS allows updates only for emails in the admin
// allowlist (see migration 0006).
export function FigureEditor({ figure, onClose, onSaved }: FigureEditorProps) {
  const [focalX, setFocalX] = useState(figure.focal_x);
  const [focalY, setFocalY] = useState(figure.focal_y);
  const [startSize, setStartSize] = useState(figure.start_size);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Natural image dimensions, captured on load. The editor sizes the
  // click target to the image's real aspect ratio so the whole image
  // is visible — no `object-cover` cropping. Without this, focal
  // points in the cropped-off regions would be unreachable.
  const [imgDim, setImgDim] = useState<ImgDim | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Pointer-driven drag: capture the pointer, translate viewport coords
  // into normalised image coords, clamp so the focal box stays within
  // [0, 1] on both axes after subtracting half the box size.
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = stageRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    update(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = stageRef.current;
    if (!el || !el.hasPointerCapture(e.pointerId)) return;
    update(e);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const el = stageRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  }

  function update(e: React.PointerEvent<HTMLDivElement>) {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setFocalX(clamp(x, 0, 1));
    setFocalY(clamp(y, 0, 1));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('figures')
        .update({
          focal_x: Number(focalX.toFixed(4)),
          focal_y: Number(focalY.toFixed(4)),
          start_size: Number(startSize.toFixed(4)),
        })
        .eq('id', figure.id);
      if (error) throw error;
      onSaved({ focal_x: focalX, focal_y: focalY, start_size: startSize });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  // Box in % of stage dimensions for the overlay outline.
  const halfBox = (startSize / 2) * 100;
  const left = focalX * 100 - halfBox;
  const top = focalY * 100 - halfBox;
  const size = startSize * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit focal point for ${figure.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-card border border-(--color-rule) bg-(--color-bg) shadow-[0_24px_48px_-12px_rgba(20,20,25,0.4)]"
      >
        <div className="flex items-baseline justify-between border-b border-(--color-rule) px-5 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-amber)">
              § Curate
            </div>
            <div
              className="leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 500,
                color: 'var(--color-ink)',
              }}
            >
              {figure.name}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-(--color-body) hover:bg-black/[0.05]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-[1.4fr_1fr]">
          {/* Left: full image with draggable focal box. The wrapper
              takes the image's natural aspect ratio so nothing is
              cropped — click anywhere on the picture to place the
              focal point. */}
          <div className="flex flex-col items-center">
            <div
              ref={stageRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-card border border-(--color-hairline) bg-(--color-paper)"
              style={{
                aspectRatio: imgDim ? `${imgDim.w} / ${imgDim.h}` : '1 / 1',
                maxHeight: '65vh',
                maxWidth: imgDim
                  ? `min(100%, calc(65vh * ${imgDim.w} / ${imgDim.h}))`
                  : '100%',
              }}
            >
              {figure.image_url && (
                <img
                  src={figure.image_url}
                  alt={figure.name}
                  draggable={false}
                  onLoad={(e) =>
                    setImgDim({
                      w: e.currentTarget.naturalWidth,
                      h: e.currentTarget.naturalHeight,
                    })
                  }
                  className="absolute inset-0 h-full w-full object-fill"
                />
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute border-2 border-(--color-amber)"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}%`,
                  height: `${size}%`,
                  boxShadow:
                    '0 0 0 1px rgba(0,0,0,0.4), 0 0 0 9999px rgba(255,255,255,0.0)',
                }}
              />
              {/* Crosshair on the focal point itself */}
              <div
                aria-hidden
                className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-(--color-amber) bg-white"
                style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
              />
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
              Click or drag inside the image to set focal point
            </div>
          </div>

          {/* Right: controls + crop preview */}
          <div className="flex flex-col gap-4">
            <CropPreview figure={figure} focalX={focalX} focalY={focalY} startSize={startSize} />

            <NumericRow label="focal_x" value={focalX} min={0} max={1} step={0.01} onChange={setFocalX} />
            <NumericRow label="focal_y" value={focalY} min={0} max={1} step={0.01} onChange={setFocalY} />
            <NumericRow label="start_size" value={startSize} min={0.1} max={0.2} step={0.005} onChange={setStartSize} />

            <div className="mt-auto flex items-center justify-end gap-2 border-t border-(--color-rule) pt-3">
              {error && (
                <span className="mr-auto text-xs text-(--color-error)">{error}</span>
              )}
              <button
                onClick={onClose}
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center rounded-button border border-(--color-hairline-strong) bg-transparent px-4 py-2 text-sm text-(--color-body) hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-(--color-amber-hover) disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumericRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
          {label}
        </label>
        <span className="tabular-nums text-[12px] text-(--color-ink)">{value.toFixed(3)}</span>
      </div>
      <input
        type="range"
        className="pfh-slider w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.currentTarget.value))}
        style={{ ['--reveal-pct' as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
    </div>
  );
}

// Shows what the player sees at 10% reveal with the current settings.
// Uses CSS background positioning to "crop" the image to the focal
// box — same math as `getCropBounds(focal, startSize, 10)`.
function CropPreview({
  figure,
  focalX,
  focalY,
  startSize,
}: {
  figure: Figure;
  focalX: number;
  focalY: number;
  startSize: number;
}) {
  const left = clamp(focalX - startSize / 2, 0, 1 - startSize);
  const top = clamp(focalY - startSize / 2, 0, 1 - startSize);
  // Background-size scales the full image so the `startSize` window
  // fills the preview box. Background-position picks which window.
  const scale = 1 / startSize;
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
        Player sees first
      </div>
      <div
        className="aspect-square w-full overflow-hidden rounded-card border-2 border-(--color-amber) bg-(--color-paper)"
        style={{
          backgroundImage: figure.image_url ? `url("${figure.image_url}")` : 'none',
          backgroundSize: `${scale * 100}% ${scale * 100}%`,
          backgroundPosition: `${(left / (1 - startSize)) * 100}% ${(top / (1 - startSize)) * 100}%`,
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
