const MAX_ROWS = 5000;
const SHEET_NAME = "Scores";
const USAGE_TOTALS_SHEET = "Playtime totals";
const USAGE_EVENTS_SHEET = "Playtime receipts";
const FEATURE_REQUESTS_SHEET = "Feature requests";
const MAX_PLAYTIME_EVENT = 300;

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function cleanGame_(value) {
  const game = String(value || "").trim();
  return /^[a-z0-9-]{1,40}$/.test(game) ? game : "";
}

function cleanName_(value) {
  return String(value || "").trim().replace(/\s+/g, " ").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 16);
}

function number_(value, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max ? Math.round(number) : null;
}

function spreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty("LEADERBOARD_SHEET_ID");
  if (!spreadsheetId) {
    const spreadsheet = SpreadsheetApp.create("HVN Games Leaderboard");
    const sheet = spreadsheet.getSheets()[0];
    sheet.setName(SHEET_NAME);
    sheet.appendRow(["gameId", "name", "score", "packets", "seconds", "submissionId", "createdAt"]);
    properties.setProperty("LEADERBOARD_SHEET_ID", spreadsheet.getId());
    spreadsheetId = spreadsheet.getId();
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function namedSheet_(name, headers) {
  const spreadsheet = spreadsheet_();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function sheet_() {
  const spreadsheet = spreadsheet_();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
}

function rows_() {
  const values = sheet_().getDataRange().getValues();
  return values.slice(1).filter(row => row[0]).map(row => ({
    gameId: String(row[0]), name: String(row[1]), score: Number(row[2]) || 0,
    packets: Number(row[3]) || 0, seconds: Number(row[4]) || 0,
    submissionId: String(row[5]), createdAt: row[6] instanceof Date ? row[6].toISOString() : String(row[6] || ""),
  }));
}

function gameUsage_() {
  const spreadsheet = spreadsheet_();
  const sheet = spreadsheet.getSheetByName(USAGE_TOTALS_SHEET);
  const values = sheet ? sheet.getDataRange().getValues() : [];
  const games = values.slice(1).filter(row => row[0]).map(row => ({
    gameId: String(row[0]), seconds: Number(row[1]) || 0,
  })).sort((a, b) => b.seconds - a.seconds || a.gameId.localeCompare(b.gameId));
  const requestSheet = spreadsheet.getSheetByName(FEATURE_REQUESTS_SHEET);
  const requestCounts = {};
  (requestSheet ? requestSheet.getDataRange().getValues().slice(1) : []).forEach(row => {
    if (row[0]) {
      const gameId = String(row[0]);
      const createdAt = row[2] instanceof Date ? row[2].toISOString() : String(row[2] || "");
      requestCounts[gameId] ||= { gameId, count: 0, lastRequestedAt: "" };
      requestCounts[gameId].count += 1;
      if (createdAt > requestCounts[gameId].lastRequestedAt) requestCounts[gameId].lastRequestedAt = createdAt;
    }
  });
  const requests = Object.values(requestCounts).sort((a, b) => b.lastRequestedAt.localeCompare(a.lastRequestedAt));
  return { games, requests };
}

function eventExists_(sheet, id, column) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  return sheet.getRange(2, column, lastRow - 1, 1).getValues().some(row => String(row[0]) === id);
}

function doGet(event) {
  try {
    if (event && event.parameter && event.parameter.action === "game_usage") {
      return json_({ ok: true, ...gameUsage_() });
    }
    const gameId = cleanGame_(event && event.parameter && event.parameter.game_id);
    if (!gameId) return json_({ ok: false, error: "game_id is required" });
    const order = event.parameter.order === "asc" ? "asc" : "desc";
    const limit = Math.min(Math.max(Number(event.parameter.limit) || 10, 1), 50);
    const entries = rows_().filter(row => row.gameId === gameId).sort((a, b) => {
      const byScore = order === "asc" ? a.score - b.score : b.score - a.score;
      return byScore || String(a.createdAt).localeCompare(String(b.createdAt));
    }).slice(0, limit).map(({ name, score, packets, seconds, createdAt }) => ({ name, score, packets, seconds, createdAt }));
    return json_({ ok: true, entries });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  }
}

function playtimePost_(body) {
  const gameId = cleanGame_(body.gameId);
  const seconds = number_(body.seconds, MAX_PLAYTIME_EVENT);
  const submissionId = String(body.submissionId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!gameId || seconds === null || seconds < 1 || submissionId.length < 8) return json_({ ok: false, error: "invalid playtime" });
  const receipts = namedSheet_(USAGE_EVENTS_SHEET, ["submissionId", "gameId", "seconds", "createdAt"]);
  if (eventExists_(receipts, submissionId, 1)) return json_({ ok: true, duplicate: true });
  receipts.appendRow([submissionId, gameId, seconds, new Date()]);
  const totals = namedSheet_(USAGE_TOTALS_SHEET, ["gameId", "seconds", "updatedAt"]);
  const rows = totals.getDataRange().getValues();
  const rowIndex = rows.findIndex((row, index) => index > 0 && String(row[0]) === gameId);
  if (rowIndex < 0) totals.appendRow([gameId, seconds, new Date()]);
  else {
    const totalCell = totals.getRange(rowIndex + 1, 2);
    totalCell.setValue((Number(totalCell.getValue()) || 0) + seconds);
    totals.getRange(rowIndex + 1, 3).setValue(new Date());
  }
  if (receipts.getLastRow() > MAX_ROWS + 1) receipts.deleteRows(2, receipts.getLastRow() - MAX_ROWS - 1);
  return json_({ ok: true, duplicate: false });
}

function featureRequestPost_(body) {
  const gameId = cleanGame_(body.gameId);
  const requestId = String(body.submissionId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!gameId || requestId.length < 8) return json_({ ok: false, error: "invalid feature request" });
  const requests = namedSheet_(FEATURE_REQUESTS_SHEET, ["gameId", "requestId", "createdAt"]);
  if (eventExists_(requests, requestId, 2)) return json_({ ok: true, duplicate: true });
  requests.appendRow([gameId, requestId, new Date()]);
  if (requests.getLastRow() > MAX_ROWS + 1) requests.deleteRows(2, requests.getLastRow() - MAX_ROWS - 1);
  return json_({ ok: true, duplicate: false });
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(event && event.postData && event.postData.contents || "{}");
    if (body.action === "playtime") return playtimePost_(body);
    if (body.action === "feature_request") return featureRequestPost_(body);
    const gameId = cleanGame_(body.gameId);
    const name = cleanName_(body.name);
    const score = number_(body.score, 1000000000);
    const packets = number_(body.packets, 1000000000);
    const seconds = number_(body.seconds, 1000000000);
    const submissionId = String(body.submissionId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    if (!gameId || !name || score === null || packets === null || seconds === null || submissionId.length < 8) return json_({ ok: false, error: "invalid score" });
    const sheet = sheet_();
    if (rows_().some(row => row.submissionId === submissionId)) return json_({ ok: true, duplicate: true });
    sheet.appendRow([gameId, name, score, packets, seconds, submissionId, new Date()]);
    const rowCount = sheet.getLastRow();
    if (rowCount > MAX_ROWS + 1) sheet.deleteRows(2, rowCount - MAX_ROWS - 1);
    return json_({ ok: true, duplicate: false });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  } finally {
    lock.releaseLock();
  }
}
