type BrandMarkProps = {
  tone?: 'light' | 'dark';
  onClick?: () => void;
};

export function BrandMark({ tone = 'light', onClick }: BrandMarkProps) {
  const isDark = tone === 'dark';
  const ringColor = isDark ? 'var(--color-gold)' : 'var(--color-amber)';
  const textColor = isDark ? 'var(--color-on-navy)' : 'var(--color-ink)';
  const fromColor = isDark ? 'var(--color-on-navy-muted)' : 'var(--color-muted)';

  return (
    <a
      href="#home"
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className="inline-flex items-center gap-3 no-underline"
      aria-label="People from History"
      style={{ color: textColor }}
    >
      <span
        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full border bg-transparent"
        style={{ borderColor: ringColor }}
      >
        <BustSilhouette size={28} color={textColor} />
      </span>
      <span
        className="font-display text-[12.5px] leading-[1.05] font-medium uppercase tracking-[0.18em]"
        style={{ color: textColor }}
      >
        People
        <span
          className="my-px block text-[9px] font-normal tracking-[0.24em]"
          style={{ color: fromColor }}
        >
          FROM
        </span>
        History
      </span>
    </a>
  );
}

function BustSilhouette({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="11" r="5" fill={color} />
      <path
        d="M3.5 26 C 4.5 19 9 16.5 14 16.5 C 19 16.5 23.5 19 24.5 26 Z"
        fill={color}
      />
    </svg>
  );
}
