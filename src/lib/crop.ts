export type Point = { x: number; y: number };

export type CropBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function getCropBounds(
  focal: Point,
  startSize: number,
  revealPct: number,
): CropBounds {
  const t = (revealPct - 10) / 90;
  const cropSize = startSize + t * (1 - startSize);
  const half = cropSize / 2;
  return {
    left: Math.max(0, focal.x - half),
    right: Math.min(1, focal.x + half),
    top: Math.max(0, focal.y - half),
    bottom: Math.min(1, focal.y + half),
  };
}
