# Driftlock design read

## Direction

An orbital repair chamber that keeps changing which way its core pulls. The chamber should read like a compact instrument, not a generic space backdrop: warm ivory hull, oxidized green rails, hazard amber, and a single signal-red core. Keep the gallery shell quiet and let the chamber, its shifting pull, and a legible run readout carry the identity.

Variance: high in the playfield, low in the shell. Motion: deliberate with no camera shake; reduced-motion preference holds the hazard in place. Density: low; show only the current sector, collected cells, remaining pulse, and elapsed time.

## Source research and attribution

Mechanic research: [frankstop/ThisIsTheOnlyLevel](https://github.com/frankstop/ThisIsTheOnlyLevel), MIT licensed, with a live six-stage browser version at https://frankstop.github.io/ThisIsTheOnlyLevel/. The observed game keeps a small platform layout while changing stage rules. Its repository is a four-commit, zero-star prototype; its UI and visuals are not reused. Driftlock uses only the broad rule-remix premise. No source code, art, fonts, or stage layouts are copied.

## Player and session

- Fantasy: pilot a maintenance probe across one malfunctioning orbital station whose core keeps pulling in a new direction.
- Primary verbs: thrust in four directions and spend a gravity pulse to rotate the core's pull.
- Core loop: read the pull cue, steer around the loose core, collect three signal cells, then dock at the amber hatch.
- Failure and reset: contact with the loose core or a four-minute seal timer ends the run; one button immediately restarts the six-sector route.
- Progression and replay: six named sectors with stronger pull and faster core movement. Cells restore gravity pulses. A local-only best time and no-hit result reward replay.
- Target session: 3–5 minutes for a complete run; each sector should take about 25–40 seconds.
- Camera: fixed, single-room responsive 2D view with the entire chamber visible.
- Input map: arrows or WASD thrust in four directions; Space rotates gravity; P or Escape pauses; R restarts. Narrow screens keep four directional controls and a pulse button below the playfield.
- Simulation/render boundary: a pure fixed-step simulation owns movement, gravity, cells, hazard contact, docking, and run state. Phaser renders state and forwards normalized keyboard/pointer commands.
- Asset plan: original Phaser-drawn shapes and restrained linework. No external assets, fonts, audio, accounts, analytics, or score service.
- DOM surface: semantic instructions, sector/cell/pulse/time status, pause/restart controls, an accessible result panel, and a gallery return path. The canvas is decorative; essential instructions and state remain in the DOM.

## Host flow and privacy boundary

HVN Games gallery Play → `?game=shelf&play=driftlock` → complete a sector → view the local-only result and replay or return home. Input is limited to keyboard/pointer game controls. Output is the visible result and an anonymous best time in this browser's local storage. No player name, account, telemetry, or online leaderboard is read or written. Manual fallback is the local gallery route. Rollback is a normal additive revert of Driftlock files and its one shelf entry; existing game routes stay intact.

Acceptance evidence includes repository smoke/build checks and real browser runs through gallery Play: start, thrust, gravity pulse, pause/resume, core collision/restart, full win, and local-best persistence; desktop and narrow mobile; no overflow or console errors; light/dark preference and reduced-motion review; and three complete runs or five minutes before and after fixing the largest clarity/fun issue.

## State-transition regression

During browser play, restarting from the paused overlay reset the simulation but left the pause control labeled “Resume.” Keep UI state in sync with run state on every start or restart: hide the overlay, clear held inputs, enable pause, and restore the “Pause” label and accessible name. Verify pause → restart → pause again in the browser.
