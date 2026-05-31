import { useEffect, useState } from 'react';

import { CookieNotice } from '@/components/CookieNotice';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { ProtoNav, type Screen } from '@/components/ProtoNav';
import { loadString, saveString } from '@/lib/storage';
import { startStateSync } from '@/lib/syncState';
import { AuditGallery } from '@/features/audit/AuditGallery';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { ProfileScreen } from '@/features/auth/ProfileScreen';
import { DailyGame } from '@/features/daily/DailyGame';
import { DailyResult } from '@/features/daily/DailyResult';
import { ChallengeEndScreen } from '@/features/game/ChallengeEndScreen';
import { ChallengeScreen } from '@/features/game/ChallengeScreen';
import { GameScreen } from '@/features/game/GameScreen';
import { PlaySetup } from '@/features/game/PlaySetup';
import { Landing } from '@/features/landing/Landing';
import { LeaderboardScreen } from '@/features/leaderboard/LeaderboardScreen';
import { ImprintScreen } from '@/features/legal/ImprintScreen';
import { PrivacyScreen } from '@/features/legal/PrivacyScreen';

// Returning visitors skip the marketing landing and resume where they
// left off. We persist the last in-app screen they navigated to and
// rehydrate it on mount. Restricted to playable screens — utility
// screens (login, audit, legal) fall back to Landing on return.
const RESUMABLE_SCREENS: ReadonlySet<Screen> = new Set([
  'daily-game',
  'daily',
  'challenge',
  'challenge-end',
  'game',
  'play-setup',
  'leaderboard',
  'profile',
]);

function pickInitialScreen(): Screen {
  if (typeof window === 'undefined') return 'landing';
  const last = loadString('app:lastScreen');
  if (last && (RESUMABLE_SCREENS as Set<string>).has(last)) {
    return last as Screen;
  }
  return 'landing';
}

function App() {
  const [screen, setScreen] = useState<Screen>(pickInitialScreen);

  // Wire the auth → state-sync bridge once. After this, any sign-in
  // event reconciles local and remote state automatically.
  useEffect(() => {
    startStateSync();
  }, []);

  const goTo = (id: Screen) => {
    setScreen(id);
    // Persist the destination for the resume-on-return flow. Only
    // playable screens count; auth + audit fall back to Landing next
    // time, and Landing itself is the implicit "no resume" state so
    // we explicitly clear it.
    if (id === 'landing') {
      saveString('app:lastScreen', '');
    } else if ((RESUMABLE_SCREENS as Set<string>).has(id)) {
      saveString('app:lastScreen', id);
    }
    requestAnimationFrame(() => {
      const ls = document.getElementById('landing-scroll');
      if (ls) ls.scrollTop = 0;
    });
  };

  // Show the dev nav only when (a) Vite is in dev mode AND (b) the
  // URL doesn't have `?nodev` set. Lets us preview the app like a
  // real visitor without rebuilding.
  const showDevNav =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    !new URLSearchParams(window.location.search).has('nodev');

  // Screens use `h-[calc(100vh-var(--app-bar-h))]` to subtract the
  // ProtoNav debug bar's height. When hidden, the variable resolves
  // to its base value of 0px from index.css.
  return (
    <div
      className="flex h-screen flex-col"
      style={showDevNav ? ({ ['--app-bar-h' as string]: '41px' }) : undefined}
    >
      {showDevNav && <ProtoNav screen={screen} goTo={goTo} />}
      <div className="flex min-h-0 flex-1">
        {/* Persistent left sidebar for in-app screens on desktop. The
            marketing landing renders full-width and gets its own glass
            nav, so we suppress the sidebar there. */}
        {screen !== 'landing' && (
          <DesktopSidebar goTo={goTo} currentScreen={screen} />
        )}
        <div className="min-h-0 flex-1">
          {screen === 'landing' && <Landing goTo={goTo} />}
          {screen === 'play-setup' && <PlaySetup goTo={goTo} />}
          {screen === 'game' && <GameScreen goTo={goTo} />}
          {screen === 'challenge' && <ChallengeScreen key="challenge" goTo={goTo} />}
          {screen === 'challenge-end' && <ChallengeEndScreen goTo={goTo} />}
          {screen === 'leaderboard' && <LeaderboardScreen goTo={goTo} />}
          {screen === 'daily-game' && <DailyGame key="daily-game" goTo={goTo} />}
          {screen === 'daily' && <DailyResult goTo={goTo} />}
          {screen === 'login' && <LoginScreen goTo={goTo} />}
          {screen === 'profile' && <ProfileScreen goTo={goTo} />}
          {screen === 'imprint' && <ImprintScreen goTo={goTo} />}
          {screen === 'privacy' && <PrivacyScreen goTo={goTo} />}
          {screen === 'audit' && <AuditGallery goTo={goTo} />}
        </div>
      </div>
      {/* Cookie notice — informational, dismissible. Renders once per
          device on first visit; storage-only, no consent toggles since
          we don't use marketing/analytics trackers. */}
      <CookieNotice goTo={goTo} />
    </div>
  );
}

export default App;
