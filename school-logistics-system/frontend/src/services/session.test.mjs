import test from "node:test";
import assert from "node:assert/strict";
import { clearSession, getToken, saveSession } from "./session.js";
import { pageStateKey, readPageState, writePageState } from "./pageState.js";

class Storage {
  values = new Map();
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("two tabs preserve separate accounts and page state across refresh and logout", () => {
  const tabA = new Storage();
  const tabB = new Storage();
  globalThis.localStorage = new Storage();
  localStorage.setItem("srmsToken", "legacy-shared-token");
  const accountA = { token: "token-a", user: { id: "a", role: "admin" } };
  const accountB = { token: "token-b", user: { id: "b", role: "staff" } };
  const keyA = pageStateKey(accountA.user, "/admin/audit", "AuditLogPanel.filters");
  const keyB = pageStateKey(accountB.user, "/staff/review_requests", "ReviewRequestsPanel.search");

  globalThis.sessionStorage = tabA;
  assert.equal(getToken(), null, "legacy shared credentials must never be adopted");
  saveSession(accountA, true);
  writePageState(keyA, { search: "inventory", page: 3 });

  globalThis.sessionStorage = tabB;
  assert.equal(getToken(), null, "a new tab starts independently");
  saveSession(accountB, true);
  writePageState(keyB, "uniform");

  // Refresh reconstructs state from the same tab storage.
  globalThis.sessionStorage = tabA;
  assert.equal(getToken(), "token-a");
  assert.deepEqual(JSON.parse(sessionStorage.getItem("srmsUser")), accountA.user);
  assert.deepEqual(readPageState(keyA, {}), { search: "inventory", page: 3 });
  assert.equal(sessionStorage.getItem(keyB), null);
  clearSession();
  assert.equal(getToken(), null);
  assert.equal(sessionStorage.getItem(keyA), null);

  globalThis.sessionStorage = tabB;
  assert.equal(getToken(), "token-b");
  assert.equal(readPageState(keyB, ""), "uniform");
  assert.equal(localStorage.getItem("srmsToken"), "legacy-shared-token");
});

test("switching accounts clears only this tab's old page state", () => {
  globalThis.sessionStorage = new Storage();
  saveSession({ token: "old", user: { id: "old" } });
  const key = pageStateKey({ id: "old" }, "/resources", "Resources.query");
  writePageState(key, "books");
  sessionStorage.setItem("unrelated", "keep");
  saveSession({ token: "new", user: { id: "new" } });
  assert.equal(getToken(), "new");
  assert.equal(sessionStorage.getItem(key), null);
  assert.equal(sessionStorage.getItem("unrelated"), "keep");
});

test("page state is scoped to account, campus, route and control; corrupt JSON falls back", () => {
  globalThis.sessionStorage = new Storage();
  const user = { id: "one", activeCampus: "north" };
  const key = pageStateKey(user, "/admin/users", "search");
  for (const other of [
    pageStateKey({ ...user, id: "two" }, "/admin/users", "search"),
    pageStateKey({ ...user, activeCampus: "south" }, "/admin/users", "search"),
    pageStateKey(user, "/admin/catalog", "search"),
    pageStateKey(user, "/admin/users", "status"),
  ]) assert.notEqual(key, other);
  sessionStorage.setItem(key, "broken JSON");
  assert.deepEqual(readPageState(key, () => ({ search: "" })), { search: "" });
});
