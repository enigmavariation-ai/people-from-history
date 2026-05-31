// Landing hero portrait. Shows Jacques-Louis David's "The Emperor
// Napoleon in His Study at the Tuileries" (1812) with the game's
// reveal mechanic baked in as a visual metaphor: the area around the
// face is dimmed to ~30% opacity while the face itself is rendered at
// full opacity inside a hairline-bordered rectangle. Communicates the
// game in a single glance — "we hide most of the portrait; you guess
// from the focal area".
//
// Image is served from Wikimedia Commons (public domain). Aspect
// ratio matches the painting's natural 5/8.

const IMAGE_SRC =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/The_Emperor_Napoleon_in_His_Study_at_the_Tuileries%2C_by_Jacques-Louis_David_%281812%29_-_National_Gallery_of_Art_%28Samuel_H._Kress_Foundation%29_-_2.jpg/960px-The_Emperor_Napoleon_in_His_Study_at_the_Tuileries%2C_by_Jacques-Louis_David_%281812%29_-_National_Gallery_of_Art_%28Samuel_H._Kress_Foundation%29_-_2.jpg';

// Container is a 1:1 square. The painting (natural ratio 5/8) gets
// cropped via `object-fit: cover` + `object-position: 50% 0%`, which
// anchors the top edge — so the visible area is the upper ~61% of the
// painting (head + torso), with the legs out of frame.
//
// Focal rectangle around Napoleon's face, expressed in *container*
// coordinates (after the top-anchored crop). The face sits at y≈0.18
// of the original painting; that maps to y≈0.295 in the cropped view.
const FOCAL = { x: 0.45, y: 0.30 };
const BOX = 0.22; // side length of the focal rectangle
const HALF = BOX / 2;
const LEFT = (FOCAL.x - HALF) * 100;
const RIGHT = (FOCAL.x + HALF) * 100;
const TOP = (FOCAL.y - HALF) * 100;
const BOTTOM = (FOCAL.y + HALF) * 100;

const OBJECT_POSITION = '50% 0%';

export function HeroPortrait() {
  return (
    <div
      className="pfh-hero-portrait relative mx-auto w-full overflow-hidden bg-(--color-sepia-bg)"
      style={{ aspectRatio: '1 / 1', maxHeight: 620, borderRadius: 6 }}
    >
      {/* Base layer — top portion of the painting dimmed so the
          surrounding context (medals, sash, clock, posture) reads as
          backdrop while the face stays in focus. */}
      <img
        src={IMAGE_SRC}
        alt="The Emperor Napoleon in His Study at the Tuileries, by Jacques-Louis David, 1812"
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.3, objectPosition: OBJECT_POSITION }}
      />

      {/* Focused layer — same image at full opacity, clipped to the
          rectangle around the face. */}
      <img
        src={IMAGE_SRC}
        alt=""
        aria-hidden
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: OBJECT_POSITION,
          clipPath: `polygon(${LEFT}% ${TOP}%, ${RIGHT}% ${TOP}%, ${RIGHT}% ${BOTTOM}%, ${LEFT}% ${BOTTOM}%)`,
        }}
      />

      {/* Reveal-rectangle border — same hairline treatment as the
          in-game CropStage so the landing previews the visual
          language. */}
      <div
        aria-hidden
        className="pointer-events-none absolute box-border rounded-[2px] border-2"
        style={{
          left: `${LEFT}%`,
          top: `${TOP}%`,
          width: `${RIGHT - LEFT}%`,
          height: `${BOTTOM - TOP}%`,
          borderColor: 'rgba(255,255,255,0.95)',
          boxShadow:
            '0 0 0 1px rgba(0,0,0,0.15), 0 6px 24px rgba(0,0,0,0.18)',
        }}
      />

      {(
        [
          { top: 14, left: 14, b: '1px 0 0 1px' },
          { top: 14, right: 14, b: '1px 1px 0 0' },
          { bottom: 14, left: 14, b: '0 0 1px 1px' },
          { bottom: 14, right: 14, b: '0 1px 1px 0' },
        ] satisfies Array<{
          top?: number;
          bottom?: number;
          left?: number;
          right?: number;
          b: string;
        }>
      ).map((p, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute"
          style={{
            width: 14,
            height: 14,
            borderColor: 'rgba(255,255,255,0.45)',
            borderStyle: 'solid',
            borderWidth: p.b,
            top: p.top,
            bottom: p.bottom,
            left: p.left,
            right: p.right,
          }}
        />
      ))}

      <div
        aria-hidden
        className="absolute font-mono uppercase"
        style={{
          bottom: 12,
          left: 14,
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        Napoleon · J.-L. David, 1812
      </div>
    </div>
  );
}
