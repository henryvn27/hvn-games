# HVN games design direction

## Design read

This is a small game index for friends choosing something to play. It should feel made by a person who actually plays these games: direct, a little odd, and specific about what each one does.

## Visual world

Use a quiet paper/ink base and one bright lime action color. Let the game runtimes provide the color and motion. No collection-wide metaphor, fake atmosphere, oversized launch copy, decorative glyphs, gradients, or rounded dashboard chrome.

## First viewport

The first viewport is just Phasebound: a concrete rule, a direct play button, and the actual runtime in attract mode. The page should feel like a small game someone made, not a catalog trying to sell a catalog.

## Motion grammar

One live attract loop per game. Motion should explain how the game works, not decorate the page. Reduced motion freezes attract frames while keeping game routes available.

## Material and type

Neutral paper and ink in light mode, charcoal surfaces in dark mode, with lime reserved for actions. Each runtime retains its own game-state colors. Use a deliberate installed sans-serif throughout; never use stylized monospace UI labels.

## Boundaries

- Keep the current public Pages and shared repository flow.
- Keep the real Phaser runtime in every gallery preview.
- Keep local-only play intelligence transparent, resettable, and free of third-party tracking.
- Do not copy Poki or Notch branding, assets, layout, wording, or claims.
- Do not add fake catalog depth, invented popularity, empty icons, generic marketing sections, or a shared HUD that erases game identity.

## Echo Lantern addition

Echo Lantern uses a deep-field observatory palette and a pulse ring as its signature affordance. Its UI stays low-chrome: one action, one energy bar, and transient beacons that reward movement and timing. The pulse is both the mechanic and the visual explanation.

## Quality bar

The page must make a friend want to play within seconds, work at desktop and narrow mobile widths, respect light and dark preference, expose keyboard and touch paths, and show the game doing its job before explaining it.

## Echo Lantern controls

The narrow route adds a field-instrument control cluster: a four-way d-pad for movement and a quiet Pause control, while Pulse remains the single signal-colored action. The controls stay out of the playfield on desktop and use the same verbs as keyboard play.

## Distinctness rule

The collection felt interchangeable even though the canvases used different colors and props. The shared timed-run shell flattened the experience: every route foregrounded score, streak, countdown, resource bar, generic pause copy, and replay rhythm.

Every game must own its objective shape, primary metric, failure condition, HUD vocabulary, and result language. Shared gallery routing and local play reporting are allowed; a shared score/streak/countdown/resource shell is not. New games need a one-sentence player fantasy and one primary decision that is visibly different from every existing game before implementation.

Applied here: Phasebound is the public game. Skyhook, Last Call, and Echo Lantern stay in the repo but are off the public shelf until they have a stronger point of view.

## Phasebound direction

Phasebound is the public game. It has no timer and no win target. The run ends when a hazard hits the player or the signal charge is spent. Each matching pickup raises heat: movement gets quicker, hazards move faster, and new hazards join the field. The HUD reports packets, heat, score, phase, and dash charge. A local top-ten board gives the run a reason to come back.

The words stay plain: "Grab cyan. Avoid red." is enough. The three-second start count appears before every button-triggered run so the player has a clear first beat.
