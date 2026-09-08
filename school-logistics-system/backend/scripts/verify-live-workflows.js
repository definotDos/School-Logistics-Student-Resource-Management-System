// Explicit opt-in: uses existing accounts, retains labeled workflow records, never creates users.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const Request = require("../src/models/Request");
const Inventory = require("../src/models/Inventory");
const Campus = require("../src/models/Campus");
const Notification = require("../src/models/Notification");
const ClaimSchedule = require("../src/models/ClaimSchedule");
const Resource = require("../src/models/Resource");

async function main() {
  if (!process.argv.includes("--apply")) throw new Error("Pass --apply only with approval to modify existing-account workflows. No test users are created.");
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/school_logistics");
  const admin = await User.findOne({ role: "admin", status: "active" });
  const student = await User.findOne({ role: "student", status: "active", emailVerified: true });
  const staff = student && await User.findOne({ role: "staff", status: "active", campus: student.campus, emailVerified: true });
  assert(admin && student && staff, "Existing active admin, student, and staff accounts are required.");
  const userCount = await User.countDocuments();
  const originalCampus = admin.activeCampus || "";
  const label = `Workflow verification ${Date.now()}`;
  const tokens = Object.fromEntries([admin, student, staff].map(u => [u.role, jwt.sign({ id: u._id }, process.env.JWT_SECRET || "development_secret", { expiresIn: "20m" })]));
  const call = async (role, method, path, body, status = 200) => {
    let request = supertest(app)[method](`/api${path}`).set("Authorization", `Bearer ${tokens[role]}`);
    if (body !== undefined) request = request.send(body);
    const response = await request;
    assert.equal(response.status, status, `${method} ${path}: ${response.status} ${response.body.message || ""} ${response.body.error || ""}`);
    return response.body;
  };
  try {
    await Campus.updateOne({ name: student.campus }, { $setOnInsert: { name: student.campus } }, { upsert: true });
    await call("admin", "patch", "/users/me", { activeCampus: student.campus });
    assert.equal((await call("admin", "get", "/users/me")).user.activeCampus, student.campus);
    const campus = (await call("admin", "post", "/campuses", { name: `${label} campus`, contact: "Verification only" }, 201)).campus;
    await call("admin", "patch", `/campuses/${campus._id}`, { status: "inactive" });
    assert.equal((await Campus.findById(campus._id)).status, "inactive");
    await call("staff", "post", "/campuses", { name: "Unauthorized" }, 403);
    await call("admin", "patch", "/users/me", { activeCampus: campus.name });
    assert.equal((await call("admin", "get", "/requests/all")).requests.length, 0);
    assert.equal((await call("admin", "get", "/reports/overview")).inventory.available, 0);
    await call("staff", "patch", "/users/me", { activeCampus: campus.name }, 403);
    await call("admin", "patch", "/users/me", { activeCampus: student.campus });
    await call("admin", "delete", `/campuses/${campus._id}`);
    console.log("PASS campus CRUD, persisted selection, campus report scope, role restrictions");

    const resource = (await call("admin", "post", "/resources", { name: label, category: "Workflow verification", campus: student.campus, description: "Validation record; not physical school stock", quantity: 1 }, 201)).resource;
    await call("admin", "patch", `/resources/${resource._id}`, { description: "End-to-end validation record; not physical stock" });
    assert.equal((await Resource.findById(resource._id)).description, "End-to-end validation record; not physical stock");
    const submit = async () => (await call("student", "post", "/requests", { resource: resource._id, quantity: 1, notes: label }, 201)).request;
    const cancelled = await submit();
    await call("student", "patch", `/requests/${cancelled.databaseId}/cancel`);
    assert.equal((await Request.collection.findOne({ _id: new mongoose.Types.ObjectId(cancelled.databaseId) })).status, "cancelled");
    await call("student", "patch", `/requests/${cancelled.databaseId}/cancel`, undefined, 409);
    const rejected = await submit();
    await call("staff", "post", `/requests/${rejected.databaseId}/reject`, { reason: label });
    assert.equal((await Request.findById(rejected.databaseId)).status, "rejected");
    const request = await submit();
    for (const alias of ["Pending", "pending", "PENDING"]) {
      const response = await call("staff", "get", `/requests/status/${alias}`);
      assert(response.requests.some(r => r.databaseId === request.databaseId));
    }
    await call("staff", "post", `/requests/${request.databaseId}/verify-eligibility`, { eligible: "false" }, 400);
    await call("staff", "post", `/requests/${request.databaseId}/verify-eligibility`, { eligible: true });
    const approved = await call("admin", "post", `/requests/${request.databaseId}/approve`, {});
    await call("admin", "post", `/requests/${request.databaseId}/approve`, {}, 409);
    let stock = await Inventory.findOne({ resource: resource._id });
    assert.equal(stock.available, 0); assert.equal(stock.reserved, 1);
    await call("admin", "patch", `/allocations/${approved.allocation._id}/assign-staff`, { staffId: staff._id });
    const schedule = (await call("staff", "post", `/allocations/${approved.allocation._id}/schedule`, { pickupDate: "2026-09-10", startTime: "09:00", endTime: "10:00", location: label }, 201)).schedule;
    assert((await call("student", "get", "/distribution/schedules/my")).schedules.some(s => s._id === schedule._id && s.resource.name === label));
    await call("staff", "post", `/distribution/schedules/${schedule._id}/verify`, { quantityClaimed: 1 });
    await call("staff", "post", `/distribution/allocations/${approved.allocation._id}/release`, { quantityDelivered: 1, notes: label }, 201);
    await call("staff", "post", `/distribution/allocations/${approved.allocation._id}/release`, { quantityDelivered: 1 }, 409);
    assert.equal((await Request.findById(request.databaseId)).status, "completed");
    assert.equal((await ClaimSchedule.findById(schedule._id)).status, "Completed");
    stock = await Inventory.findOne({ resource: resource._id });
    assert.equal(stock.available, 0); assert.equal(stock.reserved, 0); assert.equal(stock.issued, 1);
    console.log("PASS create, cancel, reject, status aliases, eligibility, approve, reserve, assign, schedule, verify, release, completion and repeated-action guards");

    const recipients = (await call("staff", "get", "/users?role=student")).users;
    assert(recipients.some(u => u.id === String(student._id)));
    const notification = (await call("staff", "post", "/notifications", { user: student._id, title: label, message: "Authorized workflow verification", type: "general" }, 201)).notification;
    assert((await call("student", "get", "/notifications")).notifications.some(n => n._id === notification._id));
    await call("student", "patch", `/notifications/${notification._id}/read`);
    assert.equal((await Notification.findById(notification._id)).read, true);
    assert((await call("student", "get", `/search?q=${encodeURIComponent(label)}`)).results.some(r => r.type === "Request"));
    const overview = await call("admin", "get", "/reports/overview");
    for (const status of ["pending", "approved", "cancelled", "completed", "rejected", "ready_for_claim", "claimed", "released"]) {
      assert.equal(overview.requests[status], await Request.countDocuments({ campus: student.campus, status }));
    }
    const report = await call("admin", "get", "/reports/requests/workflow?status=Cancelled");
    assert(report.details.every(r => r.status === "cancelled"));
    await call("admin", "get", "/reports/requests/workflow?startDate=invalid", undefined, 400);
    await call("admin", "patch", `/users/${student._id}/status`, { status: "Suspended" });
    assert.equal((await User.collection.findOne({ _id: student._id })).status, "suspended");
    await call("student", "get", "/requests/my", undefined, 403);
    await call("admin", "patch", `/users/${student._id}/status`, { status: "Active" });
    assert.equal((await User.findById(student._id)).status, "active");
    assert((await call("student", "get", "/requests/my")).requests.some(r => r.databaseId === request.databaseId && r.status === "completed"));
    assert.equal(await User.countDocuments(), userCount);
    console.log("PASS notification delivery/read persistence, search, exact report counts, suspend/token rejection/restore, fresh GET persistence; no users created");
    console.log(`Retained validation records: ${label}. Three requests (cancelled, rejected, completed), one labeled resource, one allocation/schedule/distribution, and notifications/audit entries.`);
  } finally {
    await User.updateOne({ _id: student._id }, { status: student.status });
    await User.updateOne({ _id: admin._id }, { activeCampus: originalCampus });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
