import { useState } from 'react';

import { sampleFigure } from '@/data/sampleFigure';
import { CropStage } from '@/features/game/CropStage';

function App() {
  const [revealPct, setRevealPct] = useState(10);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-10 px-6 py-12">
      <header className="text-center">
        <h1 className="text-4xl tracking-tight">People from History</h1>
        <p className="mt-2 text-(--color-brand-muted)">
          Guess the figure from the smallest crop you can.
        </p>
      </header>

      <CropStage
        imageUrl={sampleFigure.image_url}
        focal={{ x: sampleFigure.focal_x, y: sampleFigure.focal_y }}
        startSize={sampleFigure.start_size}
        revealPct={revealPct}
      />

      <div className="flex w-full flex-col gap-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-(--color-brand-muted)">Reveal</span>
          <span className="tabular-nums text-(--color-heading)">{revealPct}%</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={revealPct}
          onChange={(e) => setRevealPct(Number(e.target.value))}
          aria-label="Reveal amount"
          className="w-full accent-(--color-brand-amber)"
        />
        <p className="text-center text-xs text-(--color-brand-muted)">
          Hint: focused on the {sampleFigure.focal_note}
        </p>
      </div>
    </main>
  );
}

export default App;
