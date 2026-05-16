import { useState } from 'react';

import { ProtoNav, type Screen } from '@/components/ProtoNav';
import { DailyResult } from '@/features/daily/DailyResult';
import { ChallengeEndScreen } from '@/features/game/ChallengeEndScreen';
import { ChallengeScreen } from '@/features/game/ChallengeScreen';
import { GameScreen } from '@/features/game/GameScreen';
import { PlaySetup } from '@/features/game/PlaySetup';
import { Landing } from '@/features/landing/Landing';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');

  const goTo = (id: Screen) => {
    setScreen(id);
    requestAnimationFrame(() => {
      const ls = document.getElementById('landing-scroll');
      if (ls) ls.scrollTop = 0;
    });
  };

  return (
    <div className="flex h-screen flex-col">
      <ProtoNav screen={screen} goTo={goTo} />
      <div className="min-h-0 flex-1">
        {screen === 'landing' && <Landing goTo={goTo} />}
        {screen === 'play-setup' && <PlaySetup goTo={goTo} />}
        {screen === 'game' && <GameScreen goTo={goTo} />}
        {screen === 'challenge' && <ChallengeScreen key="challenge" goTo={goTo} />}
        {screen === 'challenge-end' && <ChallengeEndScreen goTo={goTo} />}
        {screen === 'daily' && <DailyResult goTo={goTo} />}
      </div>
    </div>
  );
}

export default App;
