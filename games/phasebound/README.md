# Phasebound

Phasebound is a 60-second courier run through a relay that keeps changing its mind. Move, switch phase with Space, and dash with Shift. Collect packets that match your current phase, avoid the orbiting static, and keep your streak alive.

## Player verbs

- Move with WASD or arrow keys. On touch, use the directional pad.
- Press Space to switch between cyan and amber packets.
- Press Shift to dash. A dash burns one charge and ignores static briefly.
- Press P to pause and R to restart after a run.

## Runtime notes

The simulation is kept in the Phaser scene, while the DOM owns the shell HUD and menus. All visuals are drawn locally with Phaser primitives so the game has no external asset dependency.
