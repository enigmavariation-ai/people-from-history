// Shared game-rule constants. Anything that's a knob across modes
// (challenge, daily, practice) belongs here so we can tune it once.

// Hard cap on guesses per round. After this many wrong guesses the
// round auto-ends as a loss — same outcome path as give-up. Matches
// Wordle-esque cadence and prevents brute-force keyboard mashing.
export const MAX_GUESSES_PER_ROUND = 5;
