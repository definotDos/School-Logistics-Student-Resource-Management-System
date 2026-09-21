import test from "node:test";
import assert from "node:assert/strict";
import { filterAuditLogs, formatAuditLabel, formatAuditTime } from "./auditLogs.js";

const filters = { search: "", entity: "", action: "", start: "", end: "", order: "newest" };
const logs = [
  { entityId: "shared-record", actor: "Alex", action: "request_approved", entity: "Request", timestamp: "2026-09-19T00:00:00", details: "Eligibility checked" },
  { entityId: "shared-record", actor: "Sam", action: "request_completed", entity: "Request", timestamp: "2026-09-19T23:59:59.999" },
  { entityId: "schedule-1", actor: "Alex", action: "claim_verified", entity: "ClaimSchedule", timestamp: "2026-09-20T00:00:00" },
  { entityId: "unknown-date", actor: "Alex", action: "request_created", entity: "Request", timestamp: null },
];

test("date filtering includes the entire local day and excludes missing dates", () => {
  const result = filterAuditLogs(logs, { ...filters, start: "2026-09-19", end: "2026-09-19" });
  assert.deepEqual(result.map((log) => log.action), ["request_completed", "request_approved"]);
});
test("search finds readable action names, details, and record identifiers", () => {
  for (const search of ["REQUEST APPROVED", "eligibility checked"]) {
    assert.equal(filterAuditLogs(logs, { ...filters, search })[0].action, "request_approved");
  }
  assert.equal(filterAuditLogs(logs, { ...filters, search: "shared-record" }).length, 2);
});
test("record and event filters combine with search", () => {
  assert.equal(filterAuditLogs(logs, { ...filters, search: "alex", entity: "Request", action: "request_approved" }).length, 1);
  assert.equal(filterAuditLogs(logs, { ...filters, search: "sam", entity: "ClaimSchedule" }).length, 0);
});
test("sorting preserves distinct events on the same record without mutating the source", () => {
  const original = [...logs];
  const result = filterAuditLogs(logs, { ...filters, order: "oldest" });
  assert.equal(result.length, 4);
  assert.equal(result[0].action, "request_approved");
  assert.equal(result.at(-1).entityId, "unknown-date");
  assert.deepEqual(logs, original);
});
test("display labels separate words and missing dates have a clear fallback", () => {
  assert.equal(formatAuditLabel("ClaimSchedule"), "Claim Schedule");
  assert.equal(formatAuditLabel("ready_for_claim → completed"), "Ready For Claim → Completed");
  assert.equal(formatAuditTime(null), "Date unavailable");
});
