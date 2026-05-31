import { useEffect, useState } from 'react';

type ShareCardProps = {
  text: string;
  // Title is only used by the native share sheet — most targets surface
  // it as the message subject (Mail, Messages, etc.).
  title?: string;
  buttonLabel?: string;
  // Optional: render a PNG to share alongside the text. Called lazily
  // on Share-button click; if it resolves to a Blob and the platform
  // supports file sharing, the image is attached (way more viral on
  // Instagram / iMessage / Twitter). Errors fall through to text.
  getImage?: () => Promise<Blob>;
};

type ShareOutcome = 'idle' | 'copied' | 'downloaded' | 'failed';

// Preview-first share card. The text preview is always visible (so
// users see what they'll send before they share). A single Share
// button opens the OS-native share sheet via Web Share. When
// `getImage` is provided AND the platform supports sharing files
// (most mobile browsers do), a rendered PNG is attached. Otherwise we
// fall back to text-only share, then clipboard, then file download.
export function ShareCard({
  text,
  title = 'People from History',
  buttonLabel = 'Share',
  getImage,
}: ShareCardProps) {
  const [outcome, setOutcome] = useState<ShareOutcome>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Render the preview image once on mount (and whenever text changes
  // so a new round refreshes). Object URLs are revoked on cleanup.
  useEffect(() => {
    if (!getImage) return;
    let cancelled = false;
    let url: string | null = null;
    getImage()
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch(() => {
        // Silently skip preview — share button still works text-only.
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setPreviewUrl(null);
    };
  }, [getImage, text]);

  const handleShare = async () => {
    // Try image+text first when both are available.
    let file: File | null = null;
    if (getImage) {
      try {
        const blob = await getImage();
        file = new File([blob], 'people-from-history.png', { type: 'image/png' });
      } catch {
        // Fall through to text-only share.
      }
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text, title });
        } else {
          await navigator.share({ text, title });
        }
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        // Any other share error: fall through to clipboard / download.
      }
    }

    // No Web Share — try clipboard (text). If we have an image too,
    // also offer it as a download since clipboard images aren't
    // universally supported.
    try {
      await navigator.clipboard.writeText(text);
      if (file) {
        downloadFile(file);
        setOutcome('downloaded');
        setTimeout(() => setOutcome('idle'), 3000);
      } else {
        setOutcome('copied');
        setTimeout(() => setOutcome('idle'), 2500);
      }
    } catch {
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
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Share preview"
          className="mb-3 block w-full rounded-card border border-(--color-rule) bg-(--color-paper)"
        />
      ) : (
        <pre
          aria-label="Share preview"
          className="mb-3 whitespace-pre-wrap break-words rounded-card border border-(--color-rule) bg-(--color-paper) px-5 py-4 font-mono text-[13px] leading-[1.6] text-(--color-body)"
        >
          {text}
        </pre>
      )}
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
      {outcome === 'downloaded' && (
        <div className="mt-2 text-center text-xs text-(--color-muted)">
          Image downloaded · text copied to clipboard.
        </div>
      )}
      {outcome === 'failed' && (
        <div className="mt-2 text-center text-xs text-(--color-error)">
          Couldn't share automatically. Long-press the preview to save.
        </div>
      )}
    </div>
  );
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the click handler has time to dispatch.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
