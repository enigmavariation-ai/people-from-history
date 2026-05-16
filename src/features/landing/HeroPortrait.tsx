export function HeroPortrait() {
  const focal = { x: 50, y: 36 };
  const boxFrac = 0.3;
  const half = (boxFrac * 100) / 2;
  const left = focal.x - half;
  const right = focal.x + half;
  const top = focal.y - half;
  const bottom = focal.y + half;

  return (
    <div
      className="pfh-hero-portrait relative mx-auto w-full overflow-hidden bg-(--color-sepia-bg)"
      style={{ aspectRatio: '5 / 6', maxHeight: 620, borderRadius: 6 }}
    >
      <PainterlyPortraitArt />

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, transparent 49.7%, rgba(255,255,255,0.04) 49.85%, rgba(255,255,255,0.04) 50.15%, transparent 50.3%)',
          mixBlendMode: 'overlay',
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute box-border rounded-[2px] border-2"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${right - left}%`,
          height: `${bottom - top}%`,
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
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        Placeholder · classical oil portrait
      </div>
    </div>
  );
}

function PainterlyPortraitArt() {
  const grain = 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1.4px)';
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, #E4D3AE 0%, #C7A876 45%, #6F5435 100%)',
      }}
    >
      <div
        className="absolute"
        style={{
          left: '0%',
          right: '0%',
          bottom: '-8%',
          height: '62%',
          background:
            'radial-gradient(ellipse at 50% 0%, #2E2616 0%, #1B1610 70%)',
          borderRadius: '50% 50% 0 0 / 60% 60% 0 0',
        }}
      />
      <div
        className="absolute"
        style={{
          left: '30%',
          right: '30%',
          bottom: '0%',
          height: '28%',
          background:
            'linear-gradient(180deg, rgba(245,232,200,0) 0%, rgba(245,232,200,0.16) 60%, rgba(245,232,200,0.04) 100%)',
        }}
      />
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '52%',
          width: '16%',
          height: '16%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, #BE9866 0%, #8A6940 100%)',
        }}
      />
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '16%',
          width: '46%',
          height: '46%',
          transform: 'translateX(-50%)',
          borderRadius: '48% 48% 44% 44% / 54% 54% 46% 46%',
          background:
            'radial-gradient(ellipse at 42% 38%, #E4C691 0%, #C39E62 45%, #7E5A2C 100%)',
          boxShadow:
            'inset -14px -14px 24px rgba(0,0,0,0.30), inset 10px 12px 22px rgba(255,255,255,0.12)',
        }}
      />
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '12%',
          width: '50%',
          height: '22%',
          transform: 'translateX(-50%)',
          borderRadius: '50% 50% 30% 30% / 80% 80% 30% 30%',
          background:
            'radial-gradient(ellipse at 50% 80%, #3A2C18 0%, #25180B 80%)',
        }}
      />
      <div
        className="absolute"
        style={{
          left: '32%',
          right: '32%',
          top: '32%',
          height: 1,
          background: 'rgba(0,0,0,0.10)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: grain,
          backgroundSize: '5px 5px',
          opacity: 0.45,
          mixBlendMode: 'multiply',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, transparent 45%, rgba(20,12,6,0.55) 110%)',
        }}
      />
    </div>
  );
}
