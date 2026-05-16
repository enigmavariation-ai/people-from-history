import { useState } from 'react';

import { ProtoNav, type Screen } from '@/components/ProtoNav';
import { DailyResult } from '@/features/daily/DailyResult';
import { GameScreen } from '@/features/game/GameScreen';
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
        {screen === 'game-initial' && <GameScreen key="initial" goTo={goTo} variant="initial" />}
        {screen === 'game-mid' && <GameScreen key="mid" goTo={goTo} variant="mid" />}
        {screen === 'game-correct' && (
          <GameScreen key="correct" goTo={goTo} variant="correct" />
        )}
        {screen === 'daily' && <DailyResult goTo={goTo} />}
      </div>
    </div>
  );
}

export default App;
