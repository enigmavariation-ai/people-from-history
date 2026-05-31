import { useEffect, useState } from 'react';

import { loadString, saveString } from '@/lib/storage';
import type { Screen } from '@/components/ProtoNav';

type CookieNoticeProps = {
  goTo: (s: Screen) => void;
};

// Bottom-pinned notice acknowledging the storage the app uses. Because
// People from History only uses strictly-necessary storage (auth
// tokens, local game state, captcha cookies for bot detection),
// consent under the ePrivacy Directive / § 25 (2) TTDSG is not
// technically required. This banner is informational — users can
// acknowledge it and we don't ask them to opt in or out of any
// optional category, because there is none.
//
// If marketing/analytics tracking is added later, this component
// should be upgraded to a real consent dialog with per-category
// toggles before any third-party tracker fires.
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
          We use cookies and local storage to keep you signed in, remember
          your daily streak, and protect against spam. We don't track you for
          ads or analytics.{' '}
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
