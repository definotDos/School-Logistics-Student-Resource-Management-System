const mongoose = require("mongoose");
const Request = require("../src/models/Request");
const User = require("../src/models/User");
const { getRequestReport, getResourceDemandReport } = require("../src/controllers/reportsController");
const { getDistributionProgress } = require("../src/controllers/distributionController");
const { cancelRequest } = require("../src/controllers/requestController");
const { updateUserStatus } = require("../src/controllers/userController");
const AuditLog = require("../src/models/AuditLog");
const response = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });
afterEach(() => jest.restoreAllMocks());

test.each(["Pending", "PENDING", " pending ", "Ready For Claim", "ready-for-claim"])("request schema normalizes %s", status => {
  const doc = new Request({ student: new mongoose.Types.ObjectId(), resource: "Book", status });
  expect(doc.validateSync()).toBeUndefined();
  expect(doc.status).toBe(status.toLowerCase().includes("ready") ? "ready_for_claim" : "pending");
});
test("unknown statuses remain invalid", () => {
  expect(new Request({ status: "unknown" }).validateSync().errors.status).toBeDefined();
});
test.each(["Suspended", "suspended", " SUSPENDED "])("user update normalizes %s before saving", async status => {
  jest.spyOn(User, "findById").mockResolvedValue(null);
  const update = jest.spyOn(User, "findByIdAndUpdate").mockResolvedValue({ status: "suspended" });
  const res = response();
  await updateUserStatus({ params: { id: "other" }, user: { _id: "admin" }, body: { status } }, res);
  expect(update).toHaveBeenCalledWith("other", { status: "suspended" }, { returnDocument: "after", runValidators: true });
});
test("student cancellation saves lowercase status and ownership filter", async () => {
  const doc = new Request({ student: new mongoose.Types.ObjectId(), resource: "Book", status: "pending" });
  doc.save = jest.fn().mockResolvedValue(doc);
  const find = jest.spyOn(Request, "findOne").mockResolvedValue(doc);
  jest.spyOn(AuditLog, "create").mockResolvedValue({});
  const res = response();
  await cancelRequest({ params: { id: String(doc._id) }, user: { _id: doc.student } }, res);
  expect(find).toHaveBeenCalledWith({ _id: String(doc._id), student: doc.student });
  expect(doc.status).toBe("cancelled");
  expect(doc.save).toHaveBeenCalled();
});
test("reports count canonical request statuses", async () => {
  const rows = ["pending", "approved", "rejected", "cancelled", "ready_for_claim", "claimed", "released", "completed"].map(status => ({ _id: new mongoose.Types.ObjectId(), status, resource: "Book", quantity: 1 }));
  jest.spyOn(Request, "find").mockReturnValue({ populate: () => ({ lean: async () => rows }) });
  const res = response();
  await getRequestReport({ query: {} }, res);
  expect(res.json.mock.calls[0][0].summary).toEqual({ totalRequests: 8, pending: 1, approved: 1, rejected: 1, cancelled: 1, readyForClaim: 1, claimed: 1, released: 1, completed: 1 });
  await getResourceDemandReport({ query: {} }, res);
  expect(res.json.mock.calls[1][0].allResources[0]).toMatchObject({ total: 8, approved: 4, rejected: 1, pending: 1, completed: 1 });
});
test("progress queries all canonical stages with campus scope", async () => {
  const count = jest.spyOn(Request, "countDocuments").mockImplementation(async filter => filter.status ? 1 : 8);
  const res = response();
  await getDistributionProgress({ user: { role: "admin" }, query: { campusFilter: "Campus" } }, res);
  expect(res.json.mock.calls[0][0].summary).toMatchObject({ total: 8, pending: 1, claimed: 1, cancelled: 1, percentageCompleted: 13 });
  for (const [filter] of count.mock.calls) {
    expect(filter.campus).toBe("Campus");
    if (filter.status) expect(Request.schema.path("status").enumValues).toContain(filter.status);
  }
});
