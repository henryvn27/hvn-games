const MAX_ROWS = 5000;
const SHEET_NAME = "Scores";

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

function sheet_() {
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
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
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

function doGet(event) {
  try {
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

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(event && event.postData && event.postData.contents || "{}");
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
