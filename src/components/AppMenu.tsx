import { useEffect, useState } from 'react';

import { BrandMark } from '@/components/BrandMark';
import { isPermanent } from '@/lib/auth';
import { useAuth } from '@/lib/useAuth';
import type { Screen } from '@/components/ProtoNav';

type AppMenuProps = {
  goTo: (s: Screen) => void;
  currentScreen?: Screen;
  // Whether to invert the trigger icon — useful for navy contexts. Defaults
  // to body color (ink-ish on cream).
  tone?: 'light' | 'dark';
};

// In-app navigation drawer. Hamburger trigger sits in the screen's top-left;
// tap opens a slide-in side panel with the primary nav (Daily / Challenge /
// Practice / Leaderboard / Home). Replaces the per-screen "← Home" affordance
// for everything inside the play loop; the Landing keeps its own glass nav.
export function AppMenu({ goTo, currentScreen, tone = 'light' }: AppMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const signedIn = isPermanent(user);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Prevent the body from scrolling behind the drawer while it's open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const navigate = (s: Screen) => {
    setIsOpen(false);
    goTo(s);
  };

  const triggerColor = tone === 'dark' ? 'var(--color-on-navy)' : 'var(--color-body)';

  return (
    <>
      {/* Hamburger trigger — mobile only. Desktop gets the persistent
          sidebar (see DesktopSidebar), so the drawer is unnecessary. */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 hover:bg-black/[0.05] md:hidden"
        style={{ color: triggerColor }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop — mobile-only along with the drawer. */}
      <div
        className={
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 md:hidden ' +
          (isOpen ? 'opacity-100' : 'pointer-events-none opacity-0')
        }
        onClick={() => setIsOpen(false)}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={
          'fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-(--color-bg) shadow-[8px_0_32px_-8px_rgba(20,20,25,0.25)] transition-transform duration-250 ease-out md:hidden ' +
          (isOpen ? 'translate-x-0' : '-translate-x-full')
        }
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-2">
          <BrandMark onClick={() => navigate('landing')} />
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-(--color-body) transition-colors duration-150 hover:bg-black/[0.05]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col px-2 pb-6">
          <SectionLabel>Today</SectionLabel>
          <MenuItem
            onClick={() => navigate('daily-game')}
            active={currentScreen === 'daily-game' || currentScreen === 'daily'}
          >
            Daily puzzle
          </MenuItem>

          <SectionLabel className="mt-5">Modes</SectionLabel>
          <MenuItem
            onClick={() => navigate('challenge')}
            active={currentScreen === 'challenge' || currentScreen === 'challenge-end'}
          >
            10-figure challenge
          </MenuItem>
          <MenuItem
            onClick={() => navigate(signedIn ? 'play-setup' : 'login')}
            active={currentScreen === 'game' || currentScreen === 'play-setup'}
            locked={!signedIn}
          >
            Practice
          </MenuItem>

          <SectionLabel className="mt-5">Standings</SectionLabel>
          <MenuItem
            onClick={() => navigate('leaderboard')}
            active={currentScreen === 'leaderboard'}
          >
            Leaderboard
          </MenuItem>

          <SectionLabel className="mt-5">Account</SectionLabel>
          {signedIn ? (
            <MenuItem
              onClick={() => navigate('profile')}
              active={currentScreen === 'profile'}
            >
              Profile
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => navigate('login')}
              active={currentScreen === 'login'}
            >
              Sign in
            </MenuItem>
          )}

          <div className="mt-auto border-t border-(--color-hairline) pt-3">
            <MenuItem onClick={() => navigate('landing')}>← Back to home</MenuItem>
          </div>
        </nav>
      </aside>
    </>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        'mb-1 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted) ' +
        (className ?? '')
      }
    >
      {children}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  active,
  locked,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'flex min-h-11 w-full items-center justify-between gap-2 rounded-button px-3 py-2 text-left text-[15px] transition-colors duration-150 ' +
        (active
          ? 'bg-(--color-amber-soft)/60 text-(--color-amber) font-medium'
          : 'text-(--color-ink) hover:bg-black/[0.04]')
      }
    >
      <span className="flex-1 truncate">{children}</span>
      {locked && (
        <svg
          aria-label="Sign in required"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="flex-shrink-0 text-(--color-muted)"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
    </button>
  );
}
