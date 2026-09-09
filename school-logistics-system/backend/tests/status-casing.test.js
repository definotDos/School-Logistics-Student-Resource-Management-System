const mongoose = require("mongoose");
const Request = require("../src/models/Request");
const User = require("../src/models/User");
const { getRequestReport, getResourceDemandReport } = require("../src/controllers/reportsController");
const { getDistributionProgress } = require("../src/controllers/distributionController");
const { cancelRequest, getRequestsByStatus } = require("../src/controllers/requestController");
const { updateUserStatus } = require("../src/controllers/userController");
const AuditLog = require("../src/models/AuditLog");
const Resource = require("../src/models/Resource");
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
test.each([
  ["Suspended", "suspended"],
  ["suspended", "suspended"],
  [" SUSPENDED ", "suspended"],
  ["Active", "active"],
  ["active", "active"],
])("user update normalizes %s before saving", async (status, normalizedStatus) => {
  jest.spyOn(User, "findById").mockResolvedValue(null);
  const update = jest.spyOn(User, "findByIdAndUpdate").mockResolvedValue({ status: normalizedStatus });
  const res = response();
  await updateUserStatus({ params: { id: "other" }, user: { _id: "admin" }, body: { status } }, res);
  expect(update).toHaveBeenCalledWith("other", { status: normalizedStatus }, { returnDocument: "after", runValidators: true });
});
test.each([undefined, null, "paused", " Active Status "])("user update rejects invalid status %s", async status => {
  const update = jest.spyOn(User, "findByIdAndUpdate");
  const res = response();
  await updateUserStatus({ params: { id: "other" }, user: { _id: "admin" }, body: status === undefined ? {} : { status } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(update).not.toHaveBeenCalled();
});
test.each([
  ["Pending", "pending"],
  ["pending", "pending"],
  [" Ready For Claim ", "ready_for_claim"],
  ["ready-for-claim", "ready_for_claim"],
])("request status filter queries canonical status for %s", async (requestedStatus, normalizedStatus) => {
  const rows = [{ _id: new mongoose.Types.ObjectId(), resource: "Book", status: normalizedStatus }];
  const query = {
    populate: jest.fn(),
    sort: jest.fn(),
  };
  query.populate.mockReturnValue(query);
  query.sort.mockResolvedValue(rows);
  const find = jest.spyOn(Request, "find").mockReturnValue(query);
  jest.spyOn(Resource, "find").mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
  const res = response();

  await getRequestsByStatus({ params: { status: requestedStatus }, user: { role: "staff", campus: "Campus" } }, res);

  expect(find).toHaveBeenCalledWith({ campus: "Campus", status: normalizedStatus });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: normalizedStatus, count: 1 }));
});
test.each([undefined, "paused", " Active Status "])("request status filter rejects invalid status %s", async status => {
  const find = jest.spyOn(Request, "find");
  const res = response();

  await getRequestsByStatus({ params: { status }, user: { role: "staff", campus: "Campus" } }, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(find).not.toHaveBeenCalled();
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
