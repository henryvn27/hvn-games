const STORAGE_KEY = "hvn-games:play-intelligence:v1";
const MAX_FEEDBACK = 60;

function blankData() {
  return { games: {}, experiments: {}, feedback: [] };
}

function readData() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (value && value.games && value.experiments && Array.isArray(value.feedback)) return value;
  } catch {
    // Local storage can be unavailable in private browsing or a blocked frame.
  }
  return blankData();
}

function writeData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // The game remains playable when storage is unavailable.
  }
}

function gameRecord(data, gameId) {
  data.games[gameId] ||= { starts: 0, runs: 0, wins: 0, losses: 0, seconds: 0, packets: 0, lastPlayed: null };
  return data.games[gameId];
}

function experimentRecord(data, gameId, experimentId, variant) {
  const key = `${gameId}:${experimentId}`;
  data.experiments[key] ||= { gameId, experimentId, variants: {} };
  data.experiments[key].variants[variant] ||= { starts: 0, runs: 0, wins: 0, losses: 0, seconds: 0 };
  return data.experiments[key].variants[variant];
}

export function getExperimentAssignment(gameId, experimentId, variants) {
  const data = readData();
  const key = `${gameId}:${experimentId}:assignment`;
  data.assignments ||= {};
  if (!data.assignments[key]) {
    const index = Math.floor(Math.random() * variants.length);
    data.assignments[key] = variants[index];
    writeData(data);
  }
  return data.assignments[key];
}

export function recordGalleryView() {
  const data = readData();
  data.galleryViews = (data.galleryViews || 0) + 1;
  data.lastGalleryView = new Date().toISOString();
  writeData(data);
}

export function createGameTracker(gameId, experimentId, variant, durationSeconds = 60) {
  let started = false;
  let finished = false;

  return {
    start() {
      if (started) return;
      started = true;
      const data = readData();
      gameRecord(data, gameId).starts += 1;
      experimentRecord(data, gameId, experimentId, variant).starts += 1;
      writeData(data);
    },
    finish(state) {
      if (!started || finished) return;
      finished = true;
      const data = readData();
      const game = gameRecord(data, gameId);
      const experiment = experimentRecord(data, gameId, experimentId, variant);
      const seconds = Math.round(Math.max(0, durationSeconds - state.timeLeft));
      game.runs += 1;
      game.seconds += seconds;
      game.packets += state.packets;
      game.lastPlayed = new Date().toISOString();
      experiment.runs += 1;
      experiment.seconds += seconds;
      if (state.result === "won") {
        game.wins += 1;
        experiment.wins += 1;
      } else {
        game.losses += 1;
        experiment.losses += 1;
      }
      writeData(data);
    },
    feedback(kind) {
      const data = readData();
      data.feedback.unshift({ gameId, kind, variant, createdAt: new Date().toISOString() });
      data.feedback = data.feedback.slice(0, MAX_FEEDBACK);
      writeData(data);
    },
  };
}

export function getPlayReport() {
  const data = readData();
  const games = Object.entries(data.games).map(([gameId, value]) => ({
    gameId,
    ...value,
    minutes: Math.round((value.seconds / 60) * 10) / 10,
    attentionScore: value.starts * 3 + (value.seconds / 60) + value.wins * 5,
  })).sort((left, right) => right.attentionScore - left.attentionScore);
  const favorite = games.find((game) => game.starts > 0)?.gameId || null;
  const experiments = Object.values(data.experiments).map((experiment) => ({
    ...experiment,
    variants: Object.entries(experiment.variants).map(([variant, value]) => ({ variant, ...value })),
  }));
  return {
    version: 1,
    privacy: "local-only",
    galleryViews: data.galleryViews || 0,
    favorite,
    games,
    experiments,
    feedback: data.feedback,
  };
}

export function resetPlayReport() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do when storage is unavailable.
  }
}
