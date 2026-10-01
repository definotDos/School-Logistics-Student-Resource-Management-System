const mongoose = require("mongoose");
const User = require("../src/models/User");
const Resource = require("../src/models/Resource");
const Request = require("../src/models/Request");
const AuditLog = require("../src/models/AuditLog");
const Notification = require("../src/models/Notification");
const { createRequest } = require("../src/controllers/requestController");

let req, res, saved, insert, recipients;
beforeEach(() => {
  req = { body: { resource: new mongoose.Types.ObjectId().toString(), quantity: 2 }, user: { _id: new mongoose.Types.ObjectId(), role: "student", name: "Test Student", studentId: "ST-123", campus: "Main" } };
  res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  saved = { _id: new mongoose.Types.ObjectId(), resource: "Learning Modules", quantity: 2, populate: jest.fn().mockResolvedValue(undefined) };
  jest.spyOn(Resource, "findById").mockResolvedValue({ _id: req.body.resource, name: "Learning Modules", campus: "Main", maxQuantityPerStudent: 5 });
  jest.spyOn(Request, "findOne").mockResolvedValue(null);
  jest.spyOn(Request, "create").mockResolvedValue(saved);
  jest.spyOn(AuditLog, "create").mockResolvedValue({});
  recipients = [{ _id: new mongoose.Types.ObjectId(), role: "staff" }, { _id: new mongoose.Types.ObjectId(), role: "admin" }];
  jest.spyOn(User, "find").mockReturnValue({ select: () => ({ lean: async () => recipients }) });
  insert = jest.spyOn(Notification, "insertMany").mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());

test("a saved student request notifies active campus staff and admins with role-specific review links", async () => {
  await createRequest(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(User.find).toHaveBeenCalledWith({ role: { $in: ["staff", "admin"] }, status: "active", campus: "Main" });
  const notices = insert.mock.calls[0][0];
  expect(notices).toHaveLength(2);
  for (const [index, notice] of notices.entries()) {
    expect(notice).toMatchObject({ user: recipients[index]._id, userRole: recipients[index].role, relatedEntity: "Request", relatedEntityId: saved._id, sent: true,
      metadata: { event: "request_created", studentName: "Test Student", resourceName: "Learning Modules", quantity: 2, campus: "Main" } });
    expect(notice.message).toContain("Test Student requested 2 × Learning Modules");
    expect(new Notification(notice).read).toBe(false);
  }
  expect(notices.map(n => n.actionUrl)).toEqual(["/staff/review_requests", "/admin/requests"]);
});

test("duplicate submissions never notify reviewers", async () => {
  Request.findOne.mockResolvedValue(saved);
  await createRequest(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(insert).not.toHaveBeenCalled();
});

test("resources from another campus never create requests or notifications", async () => {
  Resource.findById.mockResolvedValue({ campus: "Other", maxQuantityPerStudent: 5 });
  await createRequest(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(Request.create).not.toHaveBeenCalled();
  expect(insert).not.toHaveBeenCalled();
});

test("no eligible reviewers does not block submission", async () => {
  recipients = [];
  await createRequest(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(insert).not.toHaveBeenCalled();
});

test("notification failure preserves submission success and reports a delivery warning", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  insert.mockRejectedValue(new Error("Notification storage unavailable"));
  await createRequest(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ warning: expect.stringContaining("request was saved") }));
});
