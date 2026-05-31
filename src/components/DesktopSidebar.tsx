import { BrandMark } from '@/components/BrandMark';
import type { Screen } from '@/components/ProtoNav';
import { isPermanent } from '@/lib/auth';
import { useAuth } from '@/lib/useAuth';

type DesktopSidebarProps = {
  goTo: (s: Screen) => void;
  currentScreen: Screen;
};

// Always-visible navigation rail for ≥md viewports. Mirrors the
// hamburger drawer (AppMenu) on mobile — same items, same active-state
// rules, same auth-aware "Sign in" / "Profile" swap. Sits as a sibling
// of the active screen in the App.tsx flex row, so it doesn't overlap
// or push content; the screen just gets less horizontal space.
//
// Hidden on mobile (`md:flex`); mobile users get the drawer instead.
export function DesktopSidebar({ goTo, currentScreen }: DesktopSidebarProps) {
  const { user } = useAuth();
  const signedIn = isPermanent(user);

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden h-full w-60 flex-shrink-0 flex-col border-r border-(--color-hairline) bg-(--color-bg) md:flex"
    >
      <div className="flex items-center px-5 pb-6 pt-6">
        <BrandMark onClick={() => goTo('landing')} />
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-2 pb-6">
        <SectionLabel>Today</SectionLabel>
        <MenuItem
          onClick={() => goTo('daily-game')}
          active={currentScreen === 'daily-game' || currentScreen === 'daily'}
        >
          Daily puzzle
        </MenuItem>

        <SectionLabel className="mt-5">Modes</SectionLabel>
        <MenuItem
          onClick={() => goTo('challenge')}
          active={currentScreen === 'challenge' || currentScreen === 'challenge-end'}
        >
          10-figure challenge
        </MenuItem>
        <MenuItem
          onClick={() => goTo(signedIn ? 'play-setup' : 'login')}
          active={currentScreen === 'game' || currentScreen === 'play-setup'}
          locked={!signedIn}
        >
          Practice
        </MenuItem>

        <SectionLabel className="mt-5">Standings</SectionLabel>
        <MenuItem
          onClick={() => goTo('leaderboard')}
          active={currentScreen === 'leaderboard'}
        >
          Leaderboard
        </MenuItem>

        <SectionLabel className="mt-5">Account</SectionLabel>
        {signedIn ? (
          <MenuItem
            onClick={() => goTo('profile')}
            active={currentScreen === 'profile'}
          >
            Profile
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => goTo('login')}
            active={currentScreen === 'login'}
          >
            Sign in
          </MenuItem>
        )}

        <div className="mt-auto border-t border-(--color-hairline) pt-3">
          <MenuItem onClick={() => goTo('landing')}>← Home page</MenuItem>
        </div>
      </nav>
    </aside>
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
        'flex min-h-10 w-full items-center justify-between gap-2 rounded-button px-3 py-2 text-left text-[14px] transition-colors duration-150 ' +
        (active
          ? 'bg-(--color-amber-soft)/60 text-(--color-amber) font-medium'
          : 'text-(--color-ink) hover:bg-black/[0.04]')
      }
    >
      <span className="flex-1 truncate">{children}</span>
      {locked && (
        <svg
          aria-label="Sign in required"
          width="11"
          height="11"
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
