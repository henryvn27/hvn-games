# Neon Bastion — core-loop contract

1. **Read:** The route, build pads, core health, energy, and next-wave button are visible immediately.
2. **Place:** Choose Arc, Rail, or Pulse. Click/tap an amber pad to build if the player can afford it.
3. **Commit:** Launch the next wave. Enemies spawn in a visible queue and follow the glowing route toward the core.
4. **React:** Towers acquire the lead threat and fire automatically. The player can pause, speed up, add a tower, or upgrade the selected tower.
5. **Reward:** Kills add score and a little energy. Clearing a wave grants a larger energy payout and unlocks the next enemy mix.
6. **Fail:** A leak damages the core. At zero core health the board freezes on a short result state and offers a one-click retry.

## Deterministic state

The game exposes `window.__THREE_GAME_DIAGNOSTICS__` and `window.__THREE_GAME_TEST_HOOKS__` with seeded reset/state controls. All encounter choices use the local seeded RNG; rendering and audio do not decide gameplay.

## Interaction contract

- Pointer/touch on a build pad: place the selected tower, or select an existing tower.
- Tower buttons: choose the next placement role.
- Launch wave: begin the next wave.
- Upgrade: improve the selected tower when affordable.
- Space: launch the wave. P: pause/resume. 1/2/3: select tower role.
