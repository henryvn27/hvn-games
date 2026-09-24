(function () {
  'use strict';

  const STORAGE_KEY = 'hvn-games-shelf-leaderboards-v1';
  const PROFILE_KEY = 'hvn-games-shelf-player-v1';

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }

  function write(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* play still works */ }
  }

  function getName() {
    try {
      const name = localStorage.getItem(PROFILE_KEY) || '';
      return name.trim().toUpperCase() === 'YOU' ? '' : name;
    } catch { return ''; }
  }

  function setName(value) {
    const raw = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 16);
    const name = /^[a-zA-Z]{3}$/.test(raw) ? raw.toUpperCase() : raw;
    const safeName = name.toUpperCase() === 'YOU' ? '' : name;
    try { localStorage.setItem(PROFILE_KEY, safeName); } catch { /* play still works */ }
    return safeName;
  }

  function sortEntries(entries, order = 'asc') {
    const direction = order === 'asc' ? 1 : -1;
    return (Array.isArray(entries) ? entries : [])
      .filter(entry => entry && typeof entry.name === 'string' && Number.isFinite(entry.score))
      .sort((a, b) => direction * (a.score - b.score)
        || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }

  function get(gameId = 'reaction') {
    const data = read();
    const entries = Array.isArray(data[gameId]) ? data[gameId] : [];
    return sortEntries(entries, 'asc').slice(0, 10);
  }

  function record(gameId, score) {
    const name = getName();
    if (!name || !Number.isFinite(score) || score <= 0) return get(gameId);
    const data = read();
    const entries = Array.isArray(data[gameId]) ? data[gameId] : [];
    const now = new Date().toISOString();
    const duplicate = entries.some(entry => entry.name === name && entry.score === Math.round(score)
      && Math.abs(Date.parse(entry.createdAt) - Date.parse(now)) < 2000);
    if (!duplicate) entries.push({name, score: Math.round(score), createdAt: now});
    data[gameId] = sortEntries(entries, 'asc').slice(0, 25);
    write(data);
    return get(gameId);
  }

  function cachedScores(gameId = 'reaction') { return get(gameId); }

  window.ShelfLeaderboard = Object.freeze({get, record, getName, setName, cachedScores, sortEntries});
})();
