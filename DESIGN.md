# HVN games design direction

## Design read

This is a small game index for friends choosing something to play. It should feel made by a person who actually plays these games: direct, a little odd, and specific about what each one does.

## Visual world

Use a sky-blue game-flyer base, navy ink, and one coral action color. Let the game runtime provide the color and motion. No collection-wide metaphor, fake atmosphere, oversized launch copy, decorative glyphs, gradients, or rounded dashboard chrome.

## First viewport

The first viewport is just Orbit: a concrete rule, a direct play button, and the actual game route. The page should feel like a small game someone made, not a catalog trying to sell a catalog.

## Motion grammar

One live attract loop. Motion should explain how the game works, not decorate it. Reduced motion freezes the attract frame while keeping the game route available.

## Material and type

Sky-blue paper and navy ink in light mode, dark plum surfaces in dark mode, with coral reserved for page actions. The runtime retains its own game-state colors. Use a deliberate installed sans-serif throughout; never use stylized monospace UI labels.

## Boundaries

- Keep the current public Pages and shared repository flow.
- Keep the real runtime in the gallery preview.
- Keep local play intelligence transparent, resettable, and free of third-party tracking.
- Do not copy another game's branding, assets, layout, wording, or claims.
- Do not add fake catalog depth, invented popularity, empty icons, generic marketing sections, or a shared HUD that erases game identity.

## Distinctness rule

The collection felt interchangeable because the shared timed-run shell flattened the experience. Every future game must own its objective shape, primary metric, failure condition, HUD vocabulary, and result language. A future game needs a one-sentence player fantasy and one primary decision that is visibly different before implementation. The gallery card must also name a concrete action, and visitors must be able to filter by a play style that matches the real controls and decisions. A generic genre word by itself is not enough to distinguish a game.

The gallery uses a small plain-language play-style filter and a game-specific verb on each card. Filters only change which cards are shown; they never change the ten-game ranking or promotion requests.

Applied here: Orbit is the public game. The old experiments are gone from the repo; a future game gets a separate visual language and runtime instead of inheriting Orbit's shell.

## Orbit direction

Orbit is the public game. It has no timer and no win target. The run ends when a planet hits the player or the signal charge is spent. Each matching pickup raises heat: movement gets quicker, hazards move faster, and new hazards join the field. The HUD reports score, phase, and dash charge. A local top-ten board gives the run a reason to come back.

The words stay plain: "Match your color. Dodge the red planets." gives the goal without naming one specific collectible color. The three-second start count appears before every button-triggered run so the player has a clear first beat.
