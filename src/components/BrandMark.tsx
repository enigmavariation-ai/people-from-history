type BrandMarkProps = {
  tone?: 'light' | 'dark';
  onClick?: () => void;
};

export function BrandMark({ tone = 'light', onClick }: BrandMarkProps) {
  const textColor = tone === 'dark' ? 'var(--color-on-navy)' : 'var(--color-ink)';
  const fromColor = tone === 'dark' ? 'var(--color-on-navy-muted)' : 'var(--color-muted)';

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
      <Logo size={44} />
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

function Logo({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="block flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: 'url(/logo.png)',
        maskImage: 'url(/logo.png)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}
