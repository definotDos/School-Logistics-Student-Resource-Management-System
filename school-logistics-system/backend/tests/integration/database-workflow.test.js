const http = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const { connectTestDatabase, fixtures } = require("../helpers/database");
const Request = require("../../src/models/Request");
const Allocation = require("../../src/models/Allocation");
const ClaimSchedule = require("../../src/models/ClaimSchedule");
const Distribution = require("../../src/models/Distribution");
const Inventory = require("../../src/models/Inventory");
const Notification = require("../../src/models/Notification");
const AuditLog = require("../../src/models/AuditLog");
const Resource = require("../../src/models/Resource");
let data;
beforeAll(connectTestDatabase);
beforeEach(async () => { data = await fixtures(); });
afterEach(() => jest.restoreAllMocks());
const api = (method, path, role = "student") => http(app)[method](`/api${path}`).set("Authorization", `Bearer ${data.tokens[role]}`);
async function submitted() {
  const result = await api("post", "/requests").send({ resource: data.resource._id, quantity: 2 }).expect(201);
  return result.body.request.databaseId;
}
async function approved() {
  const id = await submitted();
  await api("post", `/requests/${id}/verify-eligibility`, "staff").send({ eligible: true }).expect(200);
  const result = await api("post", `/requests/${id}/approve`, "admin").send({}).expect(200);
  return { id, allocationId: result.body.allocation._id };
}
const scheduleBody = { pickupDate: "2027-01-05", startTime: "09:00", endTime: "10:00", location: "Library" };
async function scheduled() {
  const result = await approved();
  const schedule = await api("post", `/allocations/${result.allocationId}/schedule`, "staff").send(scheduleBody).expect(201);
  return { ...result, scheduleId: schedule.body.schedule._id };
}
async function verified() {
  const result = await scheduled();
  await api("post", `/distribution/schedules/${result.scheduleId}/verify`, "staff").send({ quantity: 2 }).expect(200);
  return result;
}
async function stock(expected) {
  expect(await Inventory.findOne({ resource: data.resource._id }).lean()).toMatchObject(expected);
}

test("login to database catalog to completed distribution, reports, notifications and audit", async () => {
  await http(app).post("/api/auth/login").send({ email: data.users.student.email, password: "TestPassword123" }).expect(200);
  const catalog = await api("get", "/resources").expect(200);
  expect(catalog.body.resources.map(r => r._id)).toContain(String(data.resource._id));
  const flow = await scheduled();
  await stock({ available: 8, reserved: 2, issued: 0 });
  expect((await Request.findById(flow.id)).status).toBe("ready_for_claim");
  expect(await Notification.exists({ user: data.users.student._id, type: "schedule" })).toBeTruthy();
  expect((await api("get", "/distribution/schedules/my")).body.schedules.map(s => s._id)).toContain(flow.scheduleId);
  expect((await api("get", "/distribution/schedules/my", "peer")).body.schedules).toEqual([]);
  await api("post", `/distribution/schedules/${flow.scheduleId}/verify`, "staff").send({ quantity: 2 }).expect(200);
  await stock({ available: 8, reserved: 2, issued: 0 });
  await api("post", `/distribution/allocations/${flow.allocationId}/release`, "staff").send({ quantity: 2 }).expect(201);
  await stock({ available: 8, reserved: 0, issued: 2 });
  expect((await Request.findById(flow.id)).status).toBe("completed");
  expect((await ClaimSchedule.findById(flow.scheduleId)).status).toBe("completed");
  expect((await api("get", "/distribution")).body.distributions).toHaveLength(1);
  expect((await api("get", "/distribution", "peer")).body.distributions).toEqual([]);
  const report = await api("get", `/reports/requests/workflow?campus=${encodeURIComponent(data.campus)}`, "admin").expect(200);
  expect(report.body.summary.completed).toBe(1);
  expect(await AuditLog.countDocuments({ campus: data.campus })).toBeGreaterThanOrEqual(7);
  await api("post", `/distribution/allocations/${flow.allocationId}/release`, "staff").send({}).expect(409);
});

test.each(["pending", "approved", "scheduled"])("cancellation of %s releases only existing reservations", async stage => {
  const flow = stage === "pending" ? { id: await submitted() } : stage === "approved" ? await approved() : await scheduled();
  await api("patch", `/requests/${flow.id}/cancel`).send({}).expect(200);
  await stock({ available: 10, reserved: 0, issued: 0 });
  expect((await Request.findById(flow.id)).status).toBe("cancelled");
  if (flow.allocationId) expect((await Allocation.findById(flow.allocationId)).status).toBe("cancelled");
  if (flow.scheduleId) expect((await ClaimSchedule.findById(flow.scheduleId)).status).toBe("cancelled");
});
test("rejection persists notification without reserving stock", async () => {
  const id = await submitted();
  await api("post", `/requests/${id}/reject`, "staff").send({ reason: "Not eligible" }).expect(200);
  await stock({ available: 10, reserved: 0 });
  expect((await Request.findById(id)).status).toBe("rejected");
  expect(await Allocation.exists({ request: id })).toBeNull();
  expect(await Notification.exists({ user: data.users.student._id, type: "rejection" })).toBeTruthy();
});
test("duplicate active requests and insufficient inventory are rejected", async () => {
  await submitted();
  await api("post", "/requests").send({ resource: data.resource._id, quantity: 1 }).expect(400);
  await Inventory.updateOne({ resource: data.resource._id }, { available: 0 });
  await api("post", "/requests", "peer").send({ resource: data.resource._id, quantity: 1 }).expect(409);
});
test.each(["approval", "schedule", "verification", "release", "cancellation"])("notification failure rolls back every %s write", async stage => {
  const flow = stage === "approval" ? { id: await submitted() } : stage === "schedule" ? await approved() : stage === "verification" || stage === "cancellation" ? await scheduled() : await verified();
  if (stage === "approval") await api("post", `/requests/${flow.id}/verify-eligibility`, "staff").send({ eligible: true }).expect(200);
  const models = [Request, Allocation, ClaimSchedule, Distribution, Inventory, Notification, AuditLog];
  const filters = [{ _id: flow.id }, { request: flow.id }, { request: flow.id }, { request: flow.id }, { resource: data.resource._id }, { campus: data.campus }, { campus: data.campus }];
  const snapshot = async () => Promise.all(models.map((model, i) => model.find(filters[i]).sort({ _id: 1 }).lean()));
  const before = await snapshot();
  jest.spyOn(Notification, "create").mockRejectedValue(new Error("Injected notification failure"));
  const endpoints = {
    approval: ["post", `/requests/${flow.id}/approve`, {}],
    schedule: ["post", `/allocations/${flow.allocationId}/schedule`, scheduleBody],
    verification: ["post", `/distribution/schedules/${flow.scheduleId}/verify`, { quantity: 2 }],
    release: ["post", `/distribution/allocations/${flow.allocationId}/release`, {}],
    cancellation: ["patch", `/requests/${flow.id}/cancel`, {}],
  };
  const [method, endpoint, body] = endpoints[stage];
  await api(method, endpoint, stage === "cancellation" ? "student" : "admin").send(body).expect(500);
  expect(await snapshot()).toEqual(before);
});
test("allocation insertion failure rolls back approval and reservation", async () => {
  const id = await submitted();
  await api("post", `/requests/${id}/verify-eligibility`, "staff").send({ eligible: true }).expect(200);
  jest.spyOn(Allocation, "create").mockRejectedValue(new Error("Injected allocation failure"));
  await api("post", `/requests/${id}/approve`, "admin").send({}).expect(500);
  expect((await Request.findById(id)).status).toBe("pending");
  await stock({ available: 10, reserved: 0, issued: 0 });
});
test("audit failure rolls back resource and initial inventory", async () => {
  jest.spyOn(AuditLog, "create").mockRejectedValue(new Error("Injected audit failure"));
  await api("post", "/resources", "admin").send({ name: "Failed insertion", category: "Books", campus: data.campus, quantity: 3 }).expect(500);
  expect(await Resource.exists({ name: "Failed insertion", campus: data.campus })).toBeNull();
});
test("public signup cannot choose elevated roles", async () => {
  for (const role of ["staff", "admin"]) await http(app).post("/api/auth/signup").send({ name: "Unauthorized", email: "unauthorized@example.test", password: "TestPassword123", campus: data.campus, role }).expect(403);
});
test("authentication, campus and management role checks fail closed", async () => {
  await http(app).get("/api/resources").expect(401);
  await api("get", "/inventory").expect(403);
  await api("get", "/users/all", "staff").expect(403);
  await api("get", `/resources?campus=${encodeURIComponent(data.otherCampus)}`).expect(403);
  expect((await api("get", "/resources", "otherStaff")).body.resources).toEqual([]);
  await api("patch", "/users/me").send({ activeCampus: data.otherCampus }).expect(403);
});
test("invalid IDs, missing resources, quantities and discontinued resources", async () => {
  await api("get", "/requests/temporary-id").expect(400);
  await api("post", "/requests").send({ resource: "mock-1" }).expect(400);
  await api("post", "/requests").send({ resource: new mongoose.Types.ObjectId() }).expect(404);
  for (const quantity of [-1, 0, 1.5, 11]) await api("post", "/requests").send({ resource: data.resource._id, quantity }).expect(400);
  await Resource.updateOne({ _id: data.resource._id }, { status: "discontinued" });
  await api("post", "/requests").send({ resource: data.resource._id }).expect(403);
});
test("students cannot read another student's request or forge ownership", async () => {
  const result = await api("post", "/requests").send({ resource: data.resource._id, student: data.users.peer._id, campus: data.otherCampus }).expect(201);
  const id = result.body.request.databaseId;
  expect(String(result.body.request.student._id)).toBe(String(data.users.student._id));
  await api("get", `/requests/${id}`, "peer").expect(403);
  await api("post", `/requests/${id}/approve`, "otherStaff").send({}).expect(403);
  await api("post", `/requests/${id}/approve`).send({}).expect(403);
  await api("post", `/requests/${id}/approve`, "admin").send({}).expect(409);
  await api("post", `/requests/${id}/status`, "admin").send({ status: "completed" }).expect(409);
});
test("admin's persisted campus selection controls subsequent queries", async () => {
  await api("patch", "/users/me", "admin").send({ activeCampus: data.otherCampus }).expect(200);
  expect((await api("get", "/resources", "admin")).body.resources).toEqual([]);
  await api("get", `/reports/overview?campus=${encodeURIComponent(data.campus)}`, "admin").expect(403);
});
test("MongoDB stores normalized workflow statuses", async () => {
  const request = await Request.create({ student: data.users.student._id, resource: data.resource.name, resourceRef: data.resource._id, campus: data.campus, status: "Pending" });
  const allocation = await Allocation.create({ request: request._id, student: data.users.student._id, resource: data.resource._id, campus: data.campus, quantity: 1, status: "Reserved" });
  expect((await Request.collection.findOne({ _id: request._id })).status).toBe("pending");
  expect((await Allocation.collection.findOne({ _id: allocation._id })).status).toBe("reserved");
});
