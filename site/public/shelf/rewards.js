/* Game Shelf rewards. Games report completed actions through Shelf.record().
 * Supported events (numbers must be finite, never numeric strings):
 * game_play {id}; snake_score {score}; shooter_boss {}; memory_win {moves};
 * reaction_result {ms} AFTER the go signal only; word_win {guesses};
 * clicker_power {power}; flyer_score {score}; platform_win {}; tic_win {};
 * checkers_win {}; trade_properties {count}; golf_hole {strokes,par} on an
 * actual sink; golf_round {total,par,holed} only when all six holes were sunk.
 * Existing high scores are deliberately not imported as achievements.
 */
(function () {
  'use strict';
  const STORAGE_KEY = 'game-shelf-rewards-v1';
  const GAME_IDS = ['snake', 'dodger', 'memory', 'reaction', 'word', 'clicker', 'flappy', 'platform', 'tic', 'checkers', 'trade', 'golf'];
  const categories = {theme: 'Shelf themes', snake: 'Snake colours', ship: 'Spaceship paint', plane: 'Plane paint', golf: 'Golf balls'};
  const icons = {theme: '▦', snake: '🐍', ship: '🚀', plane: '✈', golf: '⛳'};
  const definitions = [
    ['first-play', 'Make a moment', 'Open your first game.', '🎟', 'played', 1],
    ['six-games', 'Shelf explorer', 'Try six different games.', '🧭', 'played', 6],
    ['all-games', 'Full shelf', 'Try all 12 games.', '🌟', 'played', 12],
    ['snake-ten', 'Apple collector', 'Collect 10 apples in one Garden Snake round.', '🍎', 'snakeScore', 10],
    ['first-boss', 'Mars defender', 'Defeat a boss in Space Dodger.', '🚀', 'bossWins', 1],
    ['memory-master', 'Perfectly paired', 'Finish Memory Match in 16 moves or fewer.', '🃏', 'memoryMoves', 16, 'atMost', 'moves'],
    ['quick-reaction', 'Lightning reflexes', 'React after the signal in 250 ms or less.', '⚡', 'reactionMs', 250, 'atMost', 'ms'],
    ['word-win', 'Vault unlocked', 'Solve a Word Vault puzzle.', '🔓', 'wordWins', 1],
    ['word-two', 'Code whisperer', 'Solve Word Vault in two guesses or fewer.', '🔤', 'wordGuesses', 2, 'atMost', 'guesses'],
    ['clicker-five', 'Power player', 'Reach 5 click power in Clicker Adventure.', '🪙', 'clickerPower', 5],
    ['flyer-ten', 'Clear skies', 'Pass 10 gates in one Sky Flyer flight.', '✈', 'flyerScore', 10],
    ['platform-win', 'Flag finder', 'Reach the flag in Mini Platformer.', '🚩', 'platformWins', 1],
    ['tic-win', 'Three in a row', 'Beat the computer at Tic-Tac-Toe.', '❌', 'ticWins', 1],
    ['checkers-win', 'Crowned champion', 'Beat the computer at Checkers.', '♛', 'checkersWins', 1],
    ['trade-three', 'Neighbourhood owner', 'Own three properties at once in City Trader.', '🏘', 'tradeProperties', 3],
    ['golf-first', 'On the green', 'Sink your first Mini Golf hole.', '⛳', 'golfHoles', 1],
    ['golf-ace', 'One and done', 'Get a hole in one in Mini Golf.', '🏌', 'golfBestHole', 1, 'atMost', 'strokes'],
    ['golf-round', 'Club member', 'Sink all six holes in one Mini Golf round.', '🏅', 'golfRounds', 1],
    ['golf-par', 'Under control', 'Sink all six holes and finish at par or better.', '🏆', 'golfBestDelta', 0, 'atMost', 'over par'],
    ['daily-three', 'A bright beginning', 'Complete all three daily challenges on 3 different days.', '☀️', 'dailySets', 3],
    ['daily-seven', 'A week of moments', 'Complete 7 daily sets. Consecutive days are not required.', '🎀', 'dailySets', 7],
    ['daily-fourteen', 'Twice around the sun', 'Complete 14 daily sets. Any days count.', '🌙', 'dailySets', 14]
  ];
  const catalog = definitions.map(([id, title, description, icon, metric, target, comparison = 'atLeast', unit = '']) => Object.freeze({id, title, description, icon, metric, target, comparison, unit}));
  const cosmeticDefinitions = [
    ['theme', 'classic', 'Paper arcade', null, '#ff5d8f', '#ffd65c', 'The original sunny shelf.'],
    ['theme', 'sunset', 'Peach sunset', 'first-play', '#ce5139', '#f5b957', 'A warm peach glow for your shelf.'],
    ['theme', 'ocean', 'Ocean afternoon', 'six-games', '#197f84', '#86dbd2', 'Cool sea glass and soft blue.'],
    ['snake', 'classic', 'Garden green', null, '#397665', '#244f47', 'Fresh from the garden.'],
    ['snake', 'lavender', 'Lavender trail', 'snake-ten', '#563fa4', '#aa8ee5', 'A purple trail through the patch.'],
    ['snake', 'autumn', 'Autumn harvest', 'word-win', '#983c35', '#d76b43', 'Warm leaves, crisp apples.'],
    ['ship', 'classic', 'Mars patrol', null, '#cfe4db', '#9fced0', 'The original orbital defence livery.'],
    ['ship', 'nova', 'Nova pink', 'first-boss', '#f8a7d3', '#df5799', 'A bright new star above Mars.'],
    ['ship', 'gold', 'Golden orbit', 'all-games', '#ffe2a1', '#d99a42', 'For a pilot who has seen it all.'],
    ['plane', 'classic', 'Sunset prop', null, '#f3bd70', '#dd765b', 'Your trusty little sunset plane.'],
    ['plane', 'sky', 'Blue horizon', 'flyer-ten', '#93d8f3', '#478fc9', 'A splash of blue in the evening sky.'],
    ['plane', 'cherry', 'Cherry express', 'platform-win', '#f0a0ac', '#ca486b', 'A cheerful red journey to the clouds.'],
    ['golf', 'classic', 'Club white', null, '#fffdf3', '#8bdcc0', 'A classic ball for a fresh course.'],
    ['golf', 'coral', 'Coral roll', 'golf-first', '#ff936f', '#aa452f', 'A little sunset on the putting green.'],
    ['golf', 'gold', 'Golden putt', 'golf-par', '#ffe085', '#ae7628', 'A golden reward for a round at par.'],
    ['theme', 'daybreak', 'Daybreak', 'daily-three', '#a75520', '#f5ce7f', 'A fresh golden morning for your shelf.'],
    ['snake', 'ribbon', 'Mint ribbon', 'daily-seven', '#53b2a2', '#22645e', 'Seven days of play, one bright new trail.'],
    ['golf', 'twilight', 'Twilight', 'daily-fourteen', '#c8b5fc', '#7050b2', 'An evening violet ball for a daily regular.']
  ];
  const cosmetics = cosmeticDefinitions.map(([category, id, name, achievement, main, accent, description]) => Object.freeze({category, id, name, achievement, main, accent, description}));
  const baseline = () => ({version: 1, stats: {played: [], dailySets: 0, snakeScore: 0, bossWins: 0, memoryMoves: null, reactionMs: null, wordWins: 0, wordGuesses: null, clickerPower: 1, flyerScore: 0, platformWins: 0, ticWins: 0, checkersWins: 0, tradeProperties: 0, golfHoles: 0, golfBestHole: null, golfRounds: 0, golfBestDelta: null}, earned: {}, equipped: {theme: 'classic', snake: 'classic', ship: 'classic', plane: 'classic', golf: 'classic'}});
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const integer = (value, min = 0, max = 1000000) => Number.isSafeInteger(value) && value >= min && value <= max;
  const decimal = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const clone = value => JSON.parse(JSON.stringify(value));
  let state = baseline(), storageAvailable = true;
  function metricValue(achievement) { return achievement.metric === 'played' ? state.stats.played.length : state.stats[achievement.metric]; }
  function qualifies(achievement) { const value = metricValue(achievement); return value !== null && (achievement.comparison === 'atMost' ? value <= achievement.target : value >= achievement.target); }
  function isUnlocked(item) { return !item.achievement || Object.hasOwn(state.earned, item.achievement); }
  function hydrate(raw) {
    if (!isObject(raw) || raw.version !== 1 || !isObject(raw.stats)) return;
    const source = raw.stats;
    state.stats.played = Array.isArray(source.played) ? [...new Set(source.played.filter(id => GAME_IDS.includes(id)))] : [];
    for (const [metric, max] of [['dailySets', 10000], ['snakeScore', 400], ['bossWins', 1], ['wordWins', 1], ['flyerScore', 1000000], ['platformWins', 1], ['ticWins', 1], ['checkersWins', 1], ['tradeProperties', 100], ['golfHoles', 1], ['golfRounds', 1]]) {
      if (integer(source[metric], 0, max)) state.stats[metric] = source[metric];
    }
    if (integer(source.clickerPower, 1)) state.stats.clickerPower = source.clickerPower;
    if (integer(source.memoryMoves, 8)) state.stats.memoryMoves = source.memoryMoves;
    if (decimal(source.reactionMs, Number.MIN_VALUE, 60000)) state.stats.reactionMs = source.reactionMs;
    if (state.stats.wordWins && integer(source.wordGuesses, 1, 6)) state.stats.wordGuesses = source.wordGuesses;
    if (state.stats.golfHoles && integer(source.golfBestHole, 1, 100)) state.stats.golfBestHole = source.golfBestHole;
    if (state.stats.golfRounds && integer(source.golfBestDelta, -54, 594)) state.stats.golfBestDelta = source.golfBestDelta;
    const savedEarned = isObject(raw.earned) ? raw.earned : {};
    catalog.filter(qualifies).forEach(item => { state.earned[item.id] = integer(savedEarned[item.id], 1, Number.MAX_SAFE_INTEGER) ? savedEarned[item.id] : Date.now(); });
    if (isObject(raw.equipped)) for (const category of Object.keys(categories)) {
      const item = cosmetics.find(item => item.category === category && item.id === raw.equipped[category]);
      if (item && isUnlocked(item)) state.equipped[category] = item.id;
    }
  }
  try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { try { hydrate(JSON.parse(saved)); } catch { state = baseline(); } } }
  catch { storageAvailable = false; }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true; } catch { storageAvailable = false; } }
  function applyTheme() { if (document.body) document.body.dataset.shelfTheme = state.equipped.theme; }
  applyTheme();

  // One persistent, polite live region survives navigation. Dismiss never steals focus.
  const toastQueue = []; let toastTimer = null, activeToast = null;
  function toastHost() {
    let host = document.getElementById('shelf-toast');
    if (!host && document.body) {
      host = document.createElement('aside'); host.id = 'shelf-toast'; host.className = 'shelf-toast'; host.hidden = true;
      host.setAttribute('aria-label', 'Achievement notifications');
      host.innerHTML = '<div class="shelf-toast-message" role="status" aria-live="polite" aria-atomic="true"></div><button type="button" aria-label="Dismiss achievement notification">×</button>';
      host.querySelector('button').onclick = dismissToast;
      document.body.appendChild(host);
    }
    return host;
  }
  function dismissToast() {
    clearTimeout(toastTimer); toastTimer = null; activeToast = null;
    const host = document.getElementById('shelf-toast'); if (host) { host.hidden = true; host.querySelector('.shelf-toast-message').textContent = ''; }
    showNextToast();
  }
  function showNextToast() {
    if (activeToast || !toastQueue.length) return;
    const host = toastHost(); if (!host) return;
    activeToast = toastQueue.shift();
    const rewards = cosmetics.filter(item => item.achievement === activeToast.id).map(item => item.name);
    host.querySelector('.shelf-toast-message').innerHTML = `<span class="shelf-toast-icon" aria-hidden="true">${activeToast.icon}</span><div><span class="eyebrow">Achievement unlocked</span><strong>${activeToast.title}</strong><span>${rewards.length ? `New cosmetic: ${rewards.join(' · ')}` : activeToast.description}</span></div>`;
    host.hidden = false; toastTimer = setTimeout(dismissToast, 5000);
  }
  function record(event, data = {}) {
    if (typeof event !== 'string' || !isObject(data)) return [];
    const previous = JSON.stringify(state.stats), stats = state.stats;
    const best = (metric, value) => { stats[metric] = Math.max(stats[metric], value); };
    const least = (metric, value) => { stats[metric] = stats[metric] === null ? value : Math.min(stats[metric], value); };
    switch (event) {
      case 'daily_sets': if(integer(data.count,0,10000))best('dailySets',data.count); break;
      case 'game_play': if (GAME_IDS.includes(data.id) && !stats.played.includes(data.id)) stats.played.push(data.id); break;
      case 'snake_score': if (integer(data.score, 0, 400)) best('snakeScore', data.score); break;
      case 'shooter_boss': stats.bossWins = 1; break;
      case 'memory_win': if (integer(data.moves, 8)) least('memoryMoves', data.moves); break;
      case 'reaction_result': if (decimal(data.ms, Number.MIN_VALUE, 60000)) least('reactionMs', data.ms); break;
      case 'word_win': if (integer(data.guesses, 1, 6)) { stats.wordWins = 1; least('wordGuesses', data.guesses); } break;
      case 'clicker_power': if (integer(data.power, 1)) best('clickerPower', data.power); break;
      case 'flyer_score': if (integer(data.score)) best('flyerScore', data.score); break;
      case 'platform_win': stats.platformWins = 1; break;
      case 'tic_win': stats.ticWins = 1; break;
      case 'checkers_win': stats.checkersWins = 1; break;
      case 'trade_properties': if (integer(data.count, 0, 100)) best('tradeProperties', data.count); break;
      case 'golf_hole': if (integer(data.strokes, 1, 100) && integer(data.par, 1, 10)) { stats.golfHoles = 1; least('golfBestHole', data.strokes); } break;
      case 'golf_round': if (data.holed === 6 && integer(data.total, 6, 600) && integer(data.par, 6, 60)) { stats.golfRounds = 1; least('golfBestDelta', data.total - data.par); } break;
      default: return [];
    }
    if (JSON.stringify(stats) === previous) return [];
    const newlyEarned = catalog.filter(item => !Object.hasOwn(state.earned, item.id) && qualifies(item));
    newlyEarned.forEach(item => { state.earned[item.id] = Date.now(); });
    save(); toastQueue.push(...newlyEarned); showNextToast();
    return newlyEarned.map(item => item.id);
  }
  function equip(category, id) {
    const item = cosmetics.find(item => item.category === category && item.id === id);
    if (!item || !isUnlocked(item)) return false;
    if (state.equipped[category] !== id) { state.equipped[category] = id; save(); applyTheme(); }
    return true;
  }
  function palette(category) {
    const item = cosmetics.find(item => item.category === category && item.id === state.equipped[category]);
    return item ? {main: item.main, accent: item.accent} : {main: '#fffdf3', accent: '#8bdcc0'};
  }
  function progress(item) {
    const value = metricValue(item), done = Object.hasOwn(state.earned, item.id);
    if (item.comparison === 'atMost') {
      const detail = value === null ? 'Not completed yet' : item.metric === 'golfBestDelta' ? `Best: ${value === 0 ? 'even par' : `${Math.abs(value)} ${value < 0 ? 'under' : 'over'} par`}` : `Best: ${Number.isInteger(value) ? value : Math.round(value)} ${item.unit}`;
      return {value: done ? 1 : 0, max: 1, label: detail};
    }
    return {value: Math.min(value, item.target), max: item.target, label: `${Math.min(value, item.target)} / ${item.target}${item.metric === 'played' ? ' games' : ''}`};
  }
  function achievementCard(item) {
    const done = Object.hasOwn(state.earned, item.id), p = progress(item), rewards = cosmetics.filter(cosmetic => cosmetic.achievement === item.id);
    return `<article class="shelf-achievement ${done ? 'is-earned' : ''}" data-achievement="${item.id}"><div class="shelf-achievement-top"><span class="shelf-medal" aria-hidden="true">${item.icon}</span><span class="shelf-status">${done ? '✓ Unlocked' : 'Locked'}</span></div><h3>${item.title}</h3><p>${item.description}</p><div class="shelf-progress-label">${p.label}</div><progress aria-label="${item.title}: ${p.label}" max="${p.max}" value="${p.value}"></progress><div class="shelf-card-reward">${rewards.length ? `${done ? 'Unlocked' : 'Unlocks'}: ${rewards.map(cosmetic => cosmetic.name).join(', ')}` : 'A badge for your collection'}</div></article>`;
  }
  function cosmeticCard(item) {
    const unlocked = isUnlocked(item), selected = state.equipped[item.category] === item.id, achievement = catalog.find(achievement => achievement.id === item.achievement);
    return `<article class="shelf-cosmetic ${selected ? 'is-equipped' : ''} ${unlocked ? '' : 'is-locked'}" data-cosmetic="${item.category}:${item.id}"><div class="shelf-cosmetic-preview preview-${item.category}" style="--cosmetic-main:${item.main};--cosmetic-accent:${item.accent}"><span class="shelf-preview-object" aria-hidden="true"><i></i></span><span class="shelf-swatch-row" aria-hidden="true"><i></i><i></i></span></div><div class="shelf-cosmetic-body"><div class="shelf-cosmetic-title"><h4>${item.name}</h4><span>${selected ? '✓' : unlocked ? '●' : '🔒'}</span></div><p>${item.description}</p><span class="shelf-unlock-note">${!achievement ? 'Always available' : `${unlocked ? 'Unlocked by' : 'Earn'} “${achievement.title}”`}</span><button type="button" class="shelf-equip" data-equip-category="${item.category}" data-equip-id="${item.id}" aria-label="${selected ? 'Equipped' : unlocked ? 'Equip' : 'Locked'}: ${item.name}" aria-pressed="${selected}" ${unlocked ? '' : 'disabled'}>${selected ? '✓ Equipped' : unlocked ? 'Equip' : 'Locked'}</button></div></article>`;
  }
  function summary() {
    const count = Object.keys(state.earned).length, unlocked = cosmetics.filter(isUnlocked).length;
    return `<section class="shelf-home-progress" aria-label="Your arcade rewards"><div class="shelf-home-mark" aria-hidden="true">🏆</div><div><span class="eyebrow">Your arcade, your style</span><h2>${count ? `${count} achievement${count === 1 ? '' : 's'} and counting.` : 'Make your first mark.'}</h2><p>${count} / ${catalog.length} achievements · ${unlocked} / ${cosmetics.length} cosmetics available</p></div><button type="button" class="action" onclick="Shelf.render()">Achievements & style →</button></section>`;
  }
  function render() {
    const count = Object.keys(state.earned).length, unlocked = cosmetics.filter(isUnlocked).length;
    shell('Your trophy shelf', 'Play a little. Earn a badge. Make the arcade yours.', `<section class="shelf-rewards" aria-label="Achievements and cosmetics"><div class="shelf-rewards-hero"><div><span class="eyebrow">THE COLLECTION KEEPS GROWING</span><h2>Good games.<br>Great little rewards.</h2><p>Achievements unlock new colours and shelf themes. Choose your favourites below.</p></div><div class="shelf-reward-totals"><strong>${count}<span> / ${catalog.length}</span></strong><span>achievements unlocked</span><progress aria-label="Achievements unlocked" max="${catalog.length}" value="${count}"></progress><small>${unlocked} of ${cosmetics.length} cosmetics available</small></div></div><p class="shelf-storage-note">${storageAvailable ? 'Progress saves in this browser. Earn rewards by playing from now on.' : 'Browser storage is unavailable. Your rewards work for this visit, but will not survive a reload.'}</p><div class="shelf-jump-links" role="group" aria-label="Jump to rewards section"><button type="button" data-shelf-jump="shelf-achievements">🏆 Achievements</button><button type="button" data-shelf-jump="shelf-cosmetics">🎨 Choose cosmetics ↓</button></div><div class="shelf-rewards-heading"><h2 id="shelf-achievements" tabindex="-1">Achievements</h2><span>${count} unlocked · ${catalog.length - count} to discover</span></div><div class="shelf-achievement-grid">${catalog.map(achievementCard).join('')}</div><div class="shelf-rewards-heading shelf-style-heading"><div><span class="eyebrow">Make it yours</span><h2 id="shelf-cosmetics" tabindex="-1">Your cosmetics</h2></div><span>Colours are just for fun. Same game, fresh look.</span></div><p id="shelf-equip-feedback" class="sr-only" role="status" aria-live="polite"></p>${Object.entries(categories).map(([category, label]) => `<section class="shelf-cosmetic-group" aria-labelledby="cosmetics-${category}"><h3 id="cosmetics-${category}"><span aria-hidden="true">${icons[category]}</span> ${label}</h3><div class="shelf-cosmetic-grid">${cosmetics.filter(item => item.category === category).map(cosmeticCard).join('')}</div></section>`).join('')}</section>`);
    document.querySelector('.game-wrap').classList.add('rewards-wrap');
    document.querySelectorAll('[data-shelf-jump]').forEach(button => { button.onclick = () => { const target = document.getElementById(button.dataset.shelfJump); target.scrollIntoView({block: 'start'}); target.focus({preventScroll: true}); }; });
    document.querySelectorAll('[data-equip-category]').forEach(button => { button.onclick = () => {
      const category = button.dataset.equipCategory, id = button.dataset.equipId;
      if (!equip(category, id)) return;
      const item = cosmetics.find(item => item.category === category && item.id === id);
      render();
      document.querySelector(`[data-equip-category="${category}"][data-equip-id="${id}"]`).focus({preventScroll: true});
      document.getElementById('shelf-equip-feedback').textContent = `${item.name} equipped.${category === 'theme' ? '' : ' Ready for your next game.'}`;
    }; });
  }
  window.Shelf = Object.freeze({record, palette, render, summary, equip, getState: () => clone(state), catalog: Object.freeze(catalog), cosmetics: Object.freeze(cosmetics), storageKey: STORAGE_KEY});
})();
