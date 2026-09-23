# Handshake design read

**Player fantasy:** read four strangers across a neighborhood market table and decide when to split the pot and when to take it.

**Core loop:** inspect a short clue, choose Share or Keep, reveal both choices, compare the points, then decide again. Five deals make a table; four tables make a tournament. Replay to improve the score or win more tables.

**Failure and reset:** nothing is lost on an individual hand. The tournament ends after the fourth table. A new run resets every rival's memory and the player's tally.

**Session and camera:** roughly three to six minutes for 20 discrete choices. Fixed top-down table illustration; the camera does not move.

**Inputs:** Share and Keep buttons; `S` and `K` are keyboard alternatives. `P` pauses/resumes a live tournament. “Next hand” and “Next table” confirm each reveal before continuing. “New run” resets at any point.

**Rules/render boundary:** `simulation.js` owns opponent policies, score, turns, and transitions. Phaser only draws the table and tokens. DOM controls, score, partner clue, history, pause, results, and name/leaderboard form remain accessible HTML.

**Asset plan:** no downloaded assets, fonts, or copied UI. Phaser Graphics draws the table, player silhouettes, printed score marks, and tokens. Reduced-motion mode renders the same state without movement.

**Visual direction:** hand-printed card stock on an ink-blue market table; faded tomato, leaf green, and mustard identify players. Movement exists only to make the simultaneous reveal legible. Variance 5/10, motion 3/10, density 4/10.

**Anti-slop rule:** the source is a mechanic reference, not a visual template. No “trust meter,” fictional telemetry, status-dot decoration, generic feature cards, glow, or filler coaching copy. Show the payoff table before play and name the actual opponent behavior.

**Playtest correction:** the partner behavior and round premise were repeated in the move prompt and clue, while the history showed unlabeled single-letter tiles. Keep the action prompt to one short instruction; show the partner rule once; label history order as “You / neighbor” and use distinct share/keep colors. Remove help text that only repeats visible buttons. The first mobile pass also split pause and restart across toolbar rows; keep related controls in one group at every width. Future strategy games must make remembered decisions legible without requiring users to infer the symbols.
