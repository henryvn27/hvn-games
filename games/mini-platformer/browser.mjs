import policyArtifact from "./policy.json";
import { createMiniPlatformerPolicy } from "./policy.mjs";
import { drawMiniPlatformer } from "./render.mjs";
import { createPlatformerLevel, createPlatformerState, PLATFORMER_LEVEL_NAMES, PLATFORMER_STEP_SECONDS, PLATFORMER_WORLD_NAMES, platformerProgress, stepPlatformer } from "./simulation.mjs";

export const miniPlatformerPolicyArtifact = policyArtifact;
export const createTrainedMiniPlatformerPolicy = () => createMiniPlatformerPolicy(policyArtifact.weights);
export { createMiniPlatformerPolicy, drawMiniPlatformer, createPlatformerLevel, createPlatformerState, PLATFORMER_LEVEL_NAMES, PLATFORMER_STEP_SECONDS, PLATFORMER_WORLD_NAMES, platformerProgress, stepPlatformer };
