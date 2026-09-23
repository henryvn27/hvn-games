# Dockside

Stack shipping crates by timing a single drop. A centered landing adds a bonus and carries your perfect streak; an off-center landing trims the next crate. Three misses end the round. The crane picks up its pace as the stack rises.

## Controls

- Space, the drop button, or a click in the play area drops the hanging crate.
- P or Escape pauses and resumes. R starts another round after a loss.
- On touch screens, tap the play area or the drop button.

The canvas is drawn by Phaser. A deterministic rules module handles swing, overlap, scoring, misses, and the camera-follow threshold. Best score stays in this browser. Scores use the shared Dockside leaderboard and the name already saved in HVN Games; if there is no usable name, the result screen asks once.

## Source selection

The timing-and-overlap stacking loop was selected after reviewing and playing [iamkun/tower_game](https://github.com/iamkun/tower_game). Its repository is MIT-licensed, with roughly 1.6k stars and 450 forks when reviewed on 2026-09-23. Source snapshot reviewed: `c6fa84afe179b661fa71cf7cc8788d0c47ca2875`.

This is a fresh HVN implementation. No upstream source code, images, font, audio, layout, or Tower Bloxx branding is bundled. Its dockyard setting, art, exact rules, renderer, and page integration are original to HVN Games.
