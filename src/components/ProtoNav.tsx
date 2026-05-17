export const SCREENS = [
  { id: 'landing', label: 'Landing' },
  { id: 'play-setup', label: 'Setup' },
  { id: 'game', label: 'Practice' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'challenge-end', label: 'Challenge result' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'daily', label: 'Daily result' },
] as const;

export type Screen = (typeof SCREENS)[number]['id'];

type ProtoNavProps = {
  screen: Screen;
  goTo: (s: Screen) => void;
};

export function ProtoNav({ screen, goTo }: ProtoNavProps) {
  return (
    <div
      role="navigation"
      aria-label="Prototype screen switcher"
      className="sticky top-0 z-[100] flex flex-wrap items-center gap-2 border-b border-(--color-hairline) bg-[#F5F4F2] px-4 py-2 text-xs"
    >
      <span className="mr-2 tracking-wider text-(--color-muted)">
        Design prototype — click to switch screens
      </span>
      <div className="flex flex-wrap gap-1.5">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            onClick={() => goTo(s.id)}
            className={
              'rounded border px-2.5 py-1.5 text-xs font-normal transition-colors duration-150 ' +
              (screen === s.id
                ? 'border-(--color-ink) bg-(--color-ink) text-white'
                : 'border-(--color-hairline) bg-white text-(--color-body) hover:bg-black/[0.03]')
            }
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
