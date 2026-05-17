import { useState } from 'react';

type ShareCardProps = {
  text: string;
  // Title is only used by the native share sheet — most targets surface
  // it as the message subject (Mail, Messages, etc.).
  title?: string;
  buttonLabel?: string;
};

type ShareOutcome = 'idle' | 'copied' | 'failed';

// Preview-first share card. The preview is always visible (so users see
// exactly what they'll send before they share), and a single Share
// button opens the OS-native share sheet via the Web Share API. Browsers
// without Web Share (Firefox desktop, mostly) fall back to copying the
// text to the clipboard and showing a brief acknowledgement.
export function ShareCard({
  text,
  title = 'People from History',
  buttonLabel = 'Share',
}: ShareCardProps) {
  const [outcome, setOutcome] = useState<ShareOutcome>('idle');

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text, title });
        return;
      } catch (e) {
        // AbortError = user cancelled the share sheet. Treat as no-op
        // (don't fall back to clipboard or they'll get an unsolicited
        // copy after dismissing the sheet).
        if (e instanceof Error && e.name === 'AbortError') return;
        // Any other share error: fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setOutcome('copied');
      setTimeout(() => setOutcome('idle'), 2500);
    } catch {
      // Legacy clipboard fallback for the very-old browser case.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setOutcome('copied');
        setTimeout(() => setOutcome('idle'), 2500);
      } catch {
        setOutcome('failed');
        setTimeout(() => setOutcome('idle'), 3000);
      }
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
          Share your result
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
          Preview
        </div>
      </div>
      <pre
        aria-label="Share preview"
        className="mb-3 whitespace-pre-wrap break-words rounded-card border border-(--color-rule) bg-(--color-paper) px-5 py-4 font-mono text-[13px] leading-[1.6] text-(--color-body)"
      >
        {text}
      </pre>
      <button
        onClick={handleShare}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        {buttonLabel}
      </button>
      {outcome === 'copied' && (
        <div className="mt-2 text-center text-xs text-(--color-muted)">
          Copied to clipboard — paste it wherever you like.
        </div>
      )}
      {outcome === 'failed' && (
        <div className="mt-2 text-center text-xs text-(--color-error)">
          Couldn't copy automatically. Long-press the preview to copy manually.
        </div>
      )}
    </div>
  );
}
