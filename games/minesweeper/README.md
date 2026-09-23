# Minesweeper

Read the numbers, mark mines, and clear the board. The first click opens a safe patch. Once clues are showing, a guess that could hit a mine loses only when another square is provably safe. Flags are notes; they do not change what the solver knows.

Open with a click or Enter. Move through the board with arrow keys. Press F or use Flag mode to mark a square; right-click works on a mouse. Click a number with the same number of neighboring flags to open the rest around it.

Choose Easy (8 × 8, 10 mines), Standard (10 × 10, 18 mines), or Hard (12 × 10, 24 mines). Best clear time is stored locally by difficulty. A cleared board can be saved to the Minesweeper leaderboard with the display name already stored in this browser.

## Source and adaptation

The delayed-mine, solver-driven pressure mechanic was inspired by [Kaboom](https://github.com/pwmarcz/kaboom) by Piotr Marczyk, released under the MIT License. The author’s playable version is at [pwmarcz.pl/kaboom](https://pwmarcz.pl/kaboom/). This is an independent implementation for the HVN Games shelf. It does not include Kaboom source code, assets, styling, or text.

## Design

The board is a compact field of square buttons, with quiet steel cells and numbers doing the visual work. The safe-move rule is stated before play; click, flag, and chord are the only board actions. The game uses a semantic HTML grid rather than a canvas so touch targets, keyboard movement, focus, and screen-reader labels stay native.

Shared UI check: native game routes can bypass the legacy shelf bootstrap, so they must load the shared styles for any UI they invoke. Achievement notifications need a real timed browser check at desktop and narrow mobile sizes; a missing stylesheet otherwise leaves them in normal page flow.
