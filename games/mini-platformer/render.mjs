import { PLATFORMER_HEIGHT, PLATFORMER_WIDTH } from "./simulation.mjs";

const WORLD_SKY = ["#d5f0ed", "#252b49", "#e6def5"];
const WORLD_GROUND = ["#b1d9ca", "#353e60", "#c9bbdf"];
const WORLD_PLATFORM = ["#548d70", "#777799", "#9281ab"];

export function drawMiniPlatformer(context, state, decision = null) {
  const { player, platforms, stars, enemies, world, collected } = state;
  const camera = Math.max(0, Math.min(980, player.x - 200));
  context.clearRect(0, 0, PLATFORMER_WIDTH, PLATFORMER_HEIGHT);
  context.fillStyle = WORLD_SKY[world];
  context.fillRect(0, 0, PLATFORMER_WIDTH, PLATFORMER_HEIGHT);
  context.save();
  context.translate(-camera, 0);
  context.fillStyle = WORLD_GROUND[world];
  for (let index = 0; index < 9; index += 1) {
    context.beginPath();
    context.arc(index * 230 + 80, 330, 140, Math.PI, 0);
    context.fill();
  }
  for (const platform of platforms) {
    if (platform.gone) continue;
    context.fillStyle = platform.type === "spring" ? "#e8b348"
      : platform.type === "moving" ? "#5395ba"
        : platform.type === "crumble" ? "#a98572" : WORLD_PLATFORM[world];
    context.fillRect(platform.x, platform.y, platform.w, platform.h);
    context.fillStyle = "#ffffff55";
    context.fillRect(platform.x, platform.y, platform.w, 4);
    if (platform.type === "crumble") {
      context.fillStyle = "#483b43";
      context.fillText("╱╲╱╲", platform.x + 15, platform.y + 12);
    }
    if (platform.type === "spring") {
      context.fillStyle = "#523b26";
      context.fillText("↑ ↑", platform.x + 25, platform.y + 12);
    }
  }

  context.font = "23px sans-serif";
  stars.forEach((star, index) => {
    if (collected.has(index)) return;
    context.fillStyle = "#e9b439";
    context.fillText("★", star.x - 12, star.y + 8);
  });
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    context.fillStyle = "#c46673";
    context.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    context.fillStyle = "#fff";
    context.fillRect(enemy.x + 5, enemy.y + 4, 4, 4);
    context.fillRect(enemy.x + 15, enemy.y + 4, 4, 4);
  }
  for (const [x, color] of [[700, state.checkpointOn ? "#388b72" : "#cf8452"], [1530, "#ce5175"]]) {
    context.fillStyle = color;
    context.fillRect(x, 250, 4, 60);
    context.beginPath();
    context.moveTo(x + 4, 250);
    context.lineTo(x + 32, 261);
    context.lineTo(x + 4, 272);
    context.fill();
  }

  if (decision?.target) {
    const landing = decision.landing || { x: decision.target.x, y: decision.target.y - player.h };
    context.save();
    context.setLineDash([5, 5]);
    context.strokeStyle = "rgba(223, 255, 115, .85)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(player.x + player.w / 2, player.y + player.h / 2);
    context.lineTo(landing.x, landing.y + player.h / 2);
    context.stroke();
    context.restore();
    context.strokeStyle = "#dfff73";
    context.lineWidth = 2;
    context.strokeRect(decision.target.x - decision.target.w / 2, decision.target.y - 6, decision.target.w, 7);
    context.beginPath();
    context.arc(landing.x, landing.y + player.h / 2, 8, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = "#263c4b";
  context.fillRect(player.x, player.y, player.w, player.h);
  context.fillStyle = "#fff";
  context.fillRect(player.x + 13, player.y + 6, 4, 4);
  context.restore();

  if (state.won) {
    context.fillStyle = "#152333aa";
    context.fillRect(0, 0, PLATFORMER_WIDTH, PLATFORMER_HEIGHT);
    context.fillStyle = "#fff";
    context.font = "bold 30px sans-serif";
    context.textAlign = "center";
    context.fillText("Flag found!", PLATFORMER_WIDTH / 2, PLATFORMER_HEIGHT / 2);
    context.textAlign = "left";
  }
}
