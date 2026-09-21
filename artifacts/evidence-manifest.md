# Neon Bastion — evidence manifest

## Revision

- Branch: `feature/tower-defense`
- Worktree: `/Users/henry/Developer/HVN-games/worktrees/tower-defense`
- Base commit: `2da55bdc5345b1f06c399d6d457048163e3076f9`

## Browser evidence

- Local Vite dev route: `http://127.0.0.1:5174/hvn-games/?game=neon-bastion`
- Fresh-tab console check: no errors or warnings after removing the unused deprecated `THREE.Clock` call.
- Active-play capture: Rail tower placed near the first bend, enemies in flight, score and energy advancing.
- Pause capture: pause button changed to `resume`; overlay explained that the board and projectiles hold.
- Result/retry capture: under-defended run reached `Score 0`, core `0 / 10`, and a visible `try again` action.
- Successful progression: Rail tower run reached score `0063`, energy `278`, core `10 / 10`, and wave 1 clear.

## Validation commands

- `npm test` — passed, 16 required paths.
- `npm run build` — passed; Neon Bastion is code-split into its own Three.js chunk.
- `node --check site/src/tower-defense.js` — passed.
- `node --check site/src/main.js` — passed.
- `git diff --check` — passed.
- Vite production preview served the route and emitted the built HTML and Neon Bastion CSS/JS assets.

## QA scope

- Browser: manual real-input desktop playthrough covered start, placement, wave launch, targeting, reward, upgrade, pause, fail, and retry.
- Mobile: production preview verified at 390x844; touch-style canvas placement reduced energy from 300 to 230, the wave launched, and the corrected vertical control stack had no overlap.
- Audio: synthesized Web Audio tones are wired behind user gestures; no external audio asset or key is required.
- Physics: not in scope; movement uses authored lane/path interpolation and deterministic collision checks.
