import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

class MockSheet {
  constructor(name) { this.name = name; this.values = []; }
  setName(name) { this.name = name; }
  appendRow(row) { this.values.push([...row]); }
  getDataRange() { return { getValues: () => this.values.map((row) => [...row]) }; }
  getLastRow() { return this.values.length; }
  getRange(row, column, count = 1) {
    return {
      getValues: () => this.values.slice(row - 1, row - 1 + count).map((item) => [item[column - 1]]),
      getValue: () => this.values[row - 1]?.[column - 1],
      setValue: (value) => { this.values[row - 1][column - 1] = value; },
    };
  }
  deleteRows(row, count) { this.values.splice(row - 1, count); }
}

class MockSpreadsheet {
  constructor() { this.sheets = [new MockSheet("Sheet1")]; }
  getId() { return "mock-spreadsheet"; }
  getSheets() { return this.sheets; }
  getSheetByName(name) { return this.sheets.find((sheet) => sheet.name === name) || null; }
  insertSheet(name) { const sheet = new MockSheet(name); this.sheets.push(sheet); return sheet; }
}

const spreadsheet = new MockSpreadsheet();
const properties = new Map();
const context = vm.createContext({
  console, Math, String, Number, Date, JSON,
  PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => properties.get(key), setProperty: (key, value) => properties.set(key, value) }) },
  SpreadsheetApp: { create: () => spreadsheet, openById: () => spreadsheet },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: { MimeType: { JSON: "json" }, createTextOutput: (content) => ({ getContent: () => content, setMimeType() { return this; } }) },
});
vm.runInContext(readFileSync(new URL("./Code.gs", import.meta.url), "utf8"), context);

function post(body) {
  const event = { postData: { contents: JSON.stringify(body) } };
  return JSON.parse(vm.runInContext(`doPost(${JSON.stringify(event)}).getContent()`, context));
}

const first = post({ action: "playtime", gameId: "2048", seconds: 15, submissionId: "receipt-0001" });
assert.equal(first.ok, true, JSON.stringify(first));
assert.equal(first.duplicate, false);
assert.equal(post({ action: "playtime", gameId: "2048", seconds: 15, submissionId: "receipt-0001" }).duplicate, true);
assert.equal(post({ action: "playtime", gameId: "2048", seconds: 301, submissionId: "receipt-0002" }).ok, false);
post({ action: "playtime", gameId: "snake", seconds: 30, submissionId: "receipt-0003" });
const usageEvent = { parameter: { action: "game_usage" } };
const usage = JSON.parse(vm.runInContext(`doGet(${JSON.stringify(usageEvent)}).getContent()`, context));
assert.deepEqual(usage.games.map((item) => [item.gameId, item.seconds]), [["snake", 30], ["2048", 15]]);
const playtimeReceipt = spreadsheet.getSheetByName("Playtime receipts").values[1];
assert.equal(playtimeReceipt[0], "receipt-0001");
assert.equal(playtimeReceipt[1], "2048");
assert.equal(playtimeReceipt[2], 15);
assert.deepEqual(spreadsheet.getSheetByName("Playtime totals").values[0], ["gameId", "seconds", "updatedAt"]);

const requested = post({ action: "feature_request", gameId: "golf", submissionId: "request-0001" });
assert.equal(requested.ok, true);
assert.equal(post({ action: "feature_request", gameId: "golf", submissionId: "request-0001" }).duplicate, true);
const afterRequest = JSON.parse(vm.runInContext(`doGet(${JSON.stringify(usageEvent)}).getContent()`, context));
assert.deepEqual(afterRequest.requests.map((item) => [item.gameId, item.count]), [["golf", 1]]);

const score = post({ gameId: "2048", name: "HVN", score: 2048, packets: 0, seconds: 90, submissionId: "score-0001" });
assert.equal(score.ok, true, "existing leaderboard submissions keep working");
console.log("Apps Script playtime/feature-request checks passed.");
