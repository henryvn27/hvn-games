import Phaser from "phaser";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { advance, choose, createTournament, HANDSHAKE, PARTNERS, pause, resume, startNextTable, startTournament } from "./simulation.js";
import "./handshake.css";

const BEST_KEY = "hvn-games:handshake:best";
// A fresh browser best is kept separately for this game.
const $ = (root, selector) => root.querySelector(selector);
const bestScore = () => { try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; } };

export function mountHandshake(host) {
  host.innerHTML = `<section class="handshake-game" aria-label="Handshake strategy game">
    <div class="handshake-bar" aria-label="Tournament score">
      <div><span>points</span><strong data-score>0</strong></div><div><span>tables won</span><strong data-wins>0 / 4</strong></div><div><span>best score</span><strong data-best>${bestScore()}</strong></div>
      <div class="handshake-controls"><button type="button" class="handshake-control" data-pause disabled>Pause</button><button type="button" class="handshake-control" data-reset>New run</button></div>
    </div>
    <div class="handshake-layout"><div class="handshake-board-column">
      <div class="handshake-table" data-table aria-label="Market table illustration"><div class="handshake-canvas" data-canvas aria-hidden="true"></div><div class="handshake-table-caption"><span data-partner-name>The Regular</span><span data-deal-count>Table 1 · hand 1 of 5</span></div></div>
      <div class="handshake-history-wrap">
        <div class="handshake-history-heading"><strong>Recent hands</strong><span>You / neighbor</span></div>
        <div class="handshake-history" data-history aria-label="Recent hands"></div>
      </div>
    </div><aside class="handshake-side">
      <section class="handshake-round"><p class="handshake-eyebrow" data-stage>READY</p><h2 data-title>Split it or keep it?</h2>
        <p data-copy>Their choice stays hidden until you play.</p><p class="handshake-partner-note" data-note></p>
        <div class="handshake-buttons"><button type="button" class="handshake-choice handshake-share" data-share disabled>Share <span>S</span></button><button type="button" class="handshake-choice handshake-keep" data-keep disabled>Keep <span>K</span></button><button type="button" class="handshake-next" data-next hidden>Next hand</button><button type="button" class="handshake-next" data-begin>Deal the first hand</button></div>
      </section>
      <dl class="handshake-payoffs" aria-label="Points for each result"><div><dt>You Share / They Share</dt><dd>+3 each</dd></div><div><dt>You Keep / They Share</dt><dd>+6 / 0</dd></div><div><dt>You Share / They Keep</dt><dd>0 / +6</dd></div><div><dt>Both Keep</dt><dd>+1 each</dd></div></dl>
      <form class="handshake-name-form" data-name-form hidden><label for="handshake-player-name">Name or initials for the Handshake board</label><div><input id="handshake-player-name" maxlength="16" autocomplete="nickname" placeholder="Your name or initials"><button type="submit">Save</button></div></form>
      <p class="handshake-status" data-status role="status" aria-live="polite"></p><p class="handshake-help">P pauses. Your choice is final.</p>
    </aside></div>
  </section>`;

  const stage = $(host, "[data-table]");
  const canvasHost = $(host, "[data-canvas]");
  const shareButton = $(host, "[data-share]");
  const keepButton = $(host, "[data-keep]");
  const nextButton = $(host, "[data-next]");
  const beginButton = $(host, "[data-begin]");
  const pauseButton = $(host, "[data-pause]");
  const nameForm = $(host, "[data-name-form]");
  const nameInput = $(host, "#handshake-player-name");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let state = createTournament();
  let startedAt = 0;
  let savedRun = false;

  const say = (title, copy, label = "") => {
    $(host, "[data-title]").textContent = title;
    $(host, "[data-copy]").textContent = copy;
    $(host, "[data-stage]").textContent = label;
  };

  function showDeal() {
    const partner = PARTNERS[state.tableIndex] || PARTNERS.at(-1);
    $(host, "[data-partner-name]").textContent = partner.name;
    $(host, "[data-note]").textContent = partner.note;
    $(host, "[data-deal-count]").textContent = `Table ${Math.min(state.tableIndex + 1, HANDSHAKE.tables)} · hand ${Math.min(state.handIndex + 1, HANDSHAKE.dealsPerTable)} of ${HANDSHAKE.dealsPerTable}`;
    $(host, "[data-score]").textContent = String(state.totalPoints);
    $(host, "[data-wins]").textContent = `${state.tablesWon} / ${HANDSHAKE.tables}`;
    $(host, "[data-best]").textContent = String(bestScore());
    $(host, "[data-history]").innerHTML = state.hands.map((hand, index) => `<span aria-label="Hand ${index + 1}: you ${hand.player}, neighbor ${hand.opponent}; ${hand.playerPoints} points"><b data-action="${hand.player}">${hand.player === "share" ? "S" : "K"}</b><i data-action="${hand.opponent}">${hand.opponent === "share" ? "S" : "K"}</i></span>`).join("");
  }
  function render() {
    shareButton.disabled = state.mode !== "active";
    keepButton.disabled = state.mode !== "active";
    pauseButton.disabled = !["active", "paused"].includes(state.mode);
    pauseButton.textContent = state.mode === "paused" ? "Resume" : "Pause";
    nextButton.hidden = !["reveal", "between"].includes(state.mode);
    beginButton.hidden = !["ready", "result"].includes(state.mode);
    if (state.mode === "ready") say("Split it or keep it?", "Their choice stays hidden until you play.", "READY");
    if (state.mode === "active") say("Your move.", "Choose Share or Keep.", `TABLE ${state.tableIndex + 1} · HAND ${state.handIndex + 1}`);
    if (state.mode === "paused") say("Paused.", "The table is waiting. Resume when you’re ready.", "PAUSED");
    if (state.mode === "reveal") {
      const deal = state.lastDeal;
      say("Hand revealed.", `You ${deal.player}; they ${deal.opponent}. +${deal.playerPoints} / +${deal.opponentPoints}.`, "REVEAL");
      nextButton.textContent = state.handIndex + 1 === HANDSHAKE.dealsPerTable ? "Finish this table" : "Next hand";
    }
    showDeal();
    if (state.mode === "between") say("Table complete.", `${state.tablePoints} points for you; the other side scored ${state.rivalPoints}.`, `TABLE ${state.tableIndex} COMPLETE`);
    if (state.mode === "between") nextButton.textContent = `Meet ${PARTNERS[state.tableIndex].name}`;
    if (state.mode === "result") {
      try { localStorage.setItem(BEST_KEY, String(Math.max(bestScore(), state.totalPoints))); } catch { /* Score saving remains available without storage. */ }
      $(host, "[data-best]").textContent = String(bestScore());
      say(state.tablesWon >= 3 ? "You read the room." : "The table read you.", `${state.tablesWon} of ${HANDSHAKE.tables} tables won · ${state.totalPoints} points from ${state.completedDeals} hands.`, "TOURNAMENT OVER");
      beginButton.textContent = "Play again";
      saveRun();
    }
  }

  function start() {
    state = startTournament();
    startedAt = performance.now();
    savedRun = false;
    nameForm.hidden = true;
    $(host, "[data-status]").textContent = "";
    window.Shelf?.record("game_play", { id: "handshake" });
    render();
  }

  async function submitScore(value) {
    const name = setPlayerName(value);
    if (!name) {
      $(host, "[data-status]").textContent = "Enter your own initials or name. The placeholder tag will not be saved.";
      nameInput.focus();
      return;
    }
    const seconds = Math.round((performance.now() - startedAt) / 1000);
    const entry = recordLeaderboardScore("handshake", state.totalPoints, state.completedDeals, seconds);
    if (!entry) return;
    nameForm.hidden = true;
    savedRun = true;
    const online = window.HVNOnlineLeaderboard;
    if (!online?.configured) $(host, "[data-status]").textContent = `Saved as ${name} in this browser.`;
    else {
      try {
        const response = await online.submit("handshake", { name, score: state.totalPoints, packets: state.completedDeals, seconds, submissionId: online.submissionId("handshake", entry) });
        $(host, "[data-status]").textContent = response.status === "online" ? `Saved as ${name}. It’s on the shared Handshake board.` : `Saved as ${name} here. The shared board couldn’t be reached.`;
      } catch { $(host, "[data-status]").textContent = `Saved as ${name} here. The shared board couldn’t be reached.`; }
    }
  }

  function saveRun() {
    if (savedRun) return;
    const name = getPlayerName();
    if (name) void submitScore(name);
    else {
      $(host, "[data-status]").textContent = "Add your name once to put this run on the Handshake board.";
      nameForm.hidden = false;
      nameInput.focus();
    }
  }

  shareButton.addEventListener("click", () => { state = choose(state, "share"); render(); });
  keepButton.addEventListener("click", () => { state = choose(state, "keep"); render(); });
  nextButton.addEventListener("click", () => {
    if (state.mode === "between") state = startNextTable(state);
    else {
      const priorWins = state.tablesWon;
      state = advance(state);
      if (state.tablesWon > priorWins) window.Shelf?.record("handshake_table", { wins: state.tablesWon });
    }
    render();
  });
  beginButton.addEventListener("click", start);
  $(host, "[data-reset]").addEventListener("click", start);
  pauseButton.addEventListener("click", () => { state = state.mode === "paused" ? resume(state) : pause(state); render(); });
  nameForm.addEventListener("submit", (event) => { event.preventDefault(); void submitScore(nameInput.value); });
  const onKeyDown = (event) => {
    if (event.repeat || event.target instanceof Element && event.target.closest("button,input,textarea,select")) return;
    if (event.code === "KeyP" && ["active", "paused"].includes(state.mode)) {
      state = state.mode === "paused" ? resume(state) : pause(state); render();
    } else if (event.code === "KeyS" && state.mode === "active") { state = choose(state, "share"); render(); }
    else if (event.code === "KeyK" && state.mode === "active") { state = choose(state, "keep"); render(); }
  };
  window.addEventListener("keydown", onKeyDown);

  class HandshakeScene extends Phaser.Scene {
    create() { this.g = this.add.graphics(); this.clock = 0; }
    update(_time, delta) { this.clock += delta / 1000; this.draw(); }
    draw() {
      const g = this.g;
      g.clear();
      g.fillStyle(0xf0ead8, 1); g.fillRect(0, 0, 960, 560);
      g.fillStyle(0xe3dbc5, .7);
      for (let i = 0; i < 44; i += 1) g.fillCircle((i * 197 + 31) % 960, (i * 113 + 23) % 560, i % 3 === 0 ? 2 : 1);
      g.fillStyle(0x1e3943, 1); g.fillEllipse(480, 293, 638, 396);
      g.lineStyle(3, 0xc4a968, 1); g.strokeEllipse(480, 293, 638, 396);
      g.lineStyle(1, 0xa5a07d, .5); g.strokeEllipse(480, 293, 604, 364);
      g.fillStyle(0x304f55, 1); g.fillRoundedRect(340, 259, 280, 68, 20);
      g.fillStyle(0xd6c38d, .92); g.fillEllipse(480, 293, 84, 28);
      g.fillStyle(0xe6cb83, 1); g.fillCircle(469, 293, 13); g.fillStyle(0xb89650, 1); g.fillCircle(495, 293, 13);
      const partner = PARTNERS[state.tableIndex] || PARTNERS.at(-1);
      this.person(480, 112, partner.color, false);
      this.person(480, 462, "#c9825b", true);
      this.seat(480, 179, partner.color); this.seat(480, 407, "#c9825b");
      this.drawDeal(g);
    }
    drawDeal(g) {
      if (!state.lastDeal) return;
      const bob = reducedMotion.matches ? 0 : Math.sin(this.clock * 4) * 3;
      if (state.lastDeal.player === "share") { g.fillStyle(0xe6cb83, 1); g.fillCircle(452, 297 + bob, 12); }
      else { g.fillStyle(0xe6cb83, 1); g.fillCircle(432, 297 + bob, 12); g.fillCircle(457, 297 + bob, 12); }
      if (state.lastDeal.opponent === "share") { g.fillStyle(0xd49a7b, 1); g.fillCircle(508, 297 + bob, 12); }
      else { g.fillStyle(0xd49a7b, 1); g.fillCircle(503, 297 + bob, 12); g.fillCircle(528, 297 + bob, 12); }
    }
    person(x, y, color, player) {
      const g = this.g;
      g.fillStyle(0x132a32, .3); g.fillEllipse(x, y + 12, 142, 47);
      g.fillStyle(parseInt(color.slice(1), 16), 1); g.fillEllipse(x, y, 138, 54);
      g.fillStyle(player ? 0xf2cbb0 : 0xd7b59a, 1); g.fillCircle(x, y - 17, 19);
      g.fillStyle(player ? 0x334f5a : 0x3d403d, 1); g.fillEllipse(x, y - 23, 40, 14);
    }
    seat(x, y, color) {
      const g = this.g;
      g.fillStyle(parseInt(color.slice(1), 16), 1); g.fillCircle(x, y, 7);
      g.lineStyle(3, 0xf0ead8, .85); g.strokeCircle(x, y, 12);
    }
  }

  const game = new Phaser.Game({ type: Phaser.AUTO, parent: canvasHost, width: 960, height: 560, backgroundColor: "#f0ead8", scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: HandshakeScene });
  render();
  return () => { window.removeEventListener("keydown", onKeyDown); game.destroy(true); host.replaceChildren(); };
}
