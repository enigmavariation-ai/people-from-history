import { useEffect, useState } from 'react';

import { loadString, saveString } from '@/lib/storage';
import type { Screen } from '@/components/ProtoNav';

type CookieNoticeProps = {
  goTo: (s: Screen) => void;
};

// Bottom-pinned notice acknowledging the storage + telemetry the
// app uses. Storage is strictly-necessary (auth tokens, local game
// state, captcha bot-detection); telemetry is Vercel Web Analytics,
// which is cookieless first-party aggregate page-view counting with
// no user identifiers and no cross-site tracking. Together this
// stays inside the consent carve-out under § 165 (3) TKG (Austria)
// / Art. 5 (3) ePrivacy Directive, so the banner remains
// informational rather than requiring opt-in toggles.
//
// If marketing analytics, advertising trackers, or any third-party
// profiling are added later, this component should be upgraded to
// a real consent dialog with per-category toggles before any new
// tracker fires.
const STORAGE_KEY = 'cookie:acknowledged';

export function CookieNotice({ goTo }: CookieNoticeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = loadString(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    saveString(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-3 md:px-6 md:pb-6"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex w-full max-w-[720px] flex-col gap-3 rounded-card border border-(--color-rule) bg-(--color-bg) p-4 shadow-[0_12px_32px_-8px_rgba(20,20,25,0.25)] md:flex-row md:items-center md:gap-4 md:p-4">
        <div className="flex-1 text-xs leading-relaxed text-(--color-body) md:text-sm">
          Cookies and local storage keep you signed in, remember your daily
          streak, and block bots. We also count anonymous page views
          (cookieless, no cross-site tracking). No advertising, no
          profiling.{' '}
          <button
            onClick={() => {
              dismiss();
              goTo('privacy');
            }}
            className="font-medium text-(--color-amber) underline-offset-2 hover:underline"
          >
            Read our privacy policy
          </button>
          .
        </div>
        <button
          onClick={dismiss}
          className="inline-flex min-h-10 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-4 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-(--color-amber-hover)"
        >
          OK, got it
        </button>
      </div>
    </div>
  );
}
