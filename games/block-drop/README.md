# Block Drop

Place falling pieces to clear complete rows. The stack reaching the top ends the run. Every ten cleared rows adds a level and speeds up the fall.

Move with ← / → or A / D. Rotate with ↑ or X, turn the other way with Z, hold a piece with C, soft-drop with ↓, and hard-drop with Space. P or Escape pauses. Touch buttons sit below the board.

Scores use the HVN Games Block Drop board and the name already saved in this browser. A missing or example name is never submitted automatically. Best score is also stored locally.

## Source and adaptation

Block placement and line-clearing are familiar puzzle rules. The browser feature reference was [Tetr.js](https://github.com/simonlc/tetr.js), which has an [MIT license](https://github.com/simonlc/tetr.js/blob/master/LICENSE). This HVN implementation is fresh code. It does not include upstream source, art, fonts, audio, or UI.

## Design read

A clean sorting floor: a dark, square-edged playfield, warm neutral controls, and seven solid piece colors. The board is the only frame; the HUD stays in the page instead of nesting another game window. Motion is limited to falling pieces and immediate placement feedback. Density 4/10, motion 3/10, visual variance 5/10.

The previous source's settings-heavy, black menu was useful evidence of the core loop, not a template. HVN keeps the first move obvious, puts hold/next beside the board, and makes the same actions available to keyboard and touch.
