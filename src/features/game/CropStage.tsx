import { getCropBounds, type Point } from '@/lib/crop';

type CropStageProps = {
  imageUrl: string;
  focal: Point;
  startSize: number;
  revealPct: number;
};

export function CropStage({ imageUrl, focal, startSize, revealPct }: CropStageProps) {
  const bounds = getCropBounds(focal, startSize, revealPct);
  const left = bounds.left * 100;
  const right = bounds.right * 100;
  const top = bounds.top * 100;
  const bottom = bounds.bottom * 100;

  // Single-polygon mask with a "hole" at the reveal rectangle. Outer rect winds
  // clockwise; inner rect winds counter-clockwise so nonzero fill carves it out.
  // Outer points extend past 0/100 so sub-pixel rasterization can't leave a
  // hairline seam along the stage edges; the parent's overflow-hidden crops
  // the overshoot.
  const clipPath =
    `polygon(-2% -2%, 102% -2%, 102% 102%, -2% 102%, -2% -2%, ` +
    `${left}% ${top}%, ${left}% ${bottom}%, ${right}% ${bottom}%, ${right}% ${top}%, ${left}% ${top}%)`;

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-(--color-bg)">
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        // Anchor the cover-crop on the focal point. Without this, the
        // image is centred and a tall portrait's face would be
        // cropped out — the mask hole would then reveal whatever lies
        // at the stage-percentage position instead of the focal area.
        style={{ objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }}
        draggable={false}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-(--color-bg)"
        style={{ clipPath, transition: 'clip-path 300ms ease' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute border-2 border-(--color-amber)"
        style={{
          top: `${top}%`,
          left: `${left}%`,
          right: `${100 - right}%`,
          bottom: `${100 - bottom}%`,
          transition: 'top 300ms ease, left 300ms ease, right 300ms ease, bottom 300ms ease',
        }}
      />
    </div>
  );
}
