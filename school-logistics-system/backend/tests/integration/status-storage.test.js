const mongoose = require("mongoose");
const Request = require("../../src/models/Request");
const User = require("../../src/models/User");
const { getRequestReport } = require("../../src/controllers/reportsController");
const { cancelRequest } = require("../../src/controllers/requestController");
const { updateUserStatus } = require("../../src/controllers/userController");
const response = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });

beforeAll(async () => {
  if (!process.env.MONGODB_URI || !new URL(process.env.MONGODB_URI).pathname.endsWith("_test")) {
    throw new Error("An explicit disposable database ending in _test is required.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
});

test("request creation, cancellation, user update and reports persist canonical statuses", async () => {
  const user = await User.create({ name: "Status Test", email: `status-${new mongoose.Types.ObjectId()}@example.test`, password: "test-only", campus: "Status Test", status: "Active" });
  const request = await Request.create({ student: user._id, resource: "Book", campus: "Status Test", status: "Pending" });
  expect((await Request.collection.findOne({ _id: request._id })).status).toBe("pending");
  const res = response();
  await cancelRequest({ params: { id: String(request._id) }, user }, res);
  expect(res.status).not.toHaveBeenCalled();
  expect((await Request.collection.findOne({ _id: request._id })).status).toBe("cancelled");
  await updateUserStatus({ params: { id: String(user._id) }, user: { _id: new mongoose.Types.ObjectId() }, body: { status: "Suspended" } }, res);
  expect(res.status).not.toHaveBeenCalled();
  expect((await User.collection.findOne({ _id: user._id })).status).toBe("suspended");
  await getRequestReport({ query: { campus: "Status Test", status: "Cancelled" } }, res);
  expect(res.json.mock.calls.at(-1)[0].summary.cancelled).toBeGreaterThanOrEqual(1);
});
