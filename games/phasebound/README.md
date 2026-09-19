# Hot Dot

Hot Dot is a color-matching run. Move, change phase with Space, and dash with Shift. Collect the dot that matches your current phase, avoid the red Xs, and deal with the field getting faster. A hazard hit or an empty signal charge ends the run.

## Player verbs

- Move with WASD or arrow keys. On touch, use the directional pad.
- Press Space to change between cyan and amber packets.
- Press Shift to dash. A dash burns one charge and ignores static briefly.
- Press P to pause and R to restart after a run.

## Runtime notes

The simulation is kept in the Phaser scene, while the DOM owns the shell HUD and menus. All visuals are drawn locally with Phaser primitives so the game has no external asset dependency.
