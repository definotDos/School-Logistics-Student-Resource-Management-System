const jwt = require("jsonwebtoken");
const User = require("../src/models/User");
const protect = require("../src/middleware/authMiddleware");

afterEach(() => jest.restoreAllMocks());
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

test("missing credentials are rejected before querying the database", async () => {
  const lookup = jest.spyOn(User, "findById");
  const res = response();
  await protect({ headers: {} }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(401);
  expect(lookup).not.toHaveBeenCalled();
});

test("malformed tokens do not query the database", async () => {
  const lookup = jest.spyOn(User, "findById");
  const res = response();
  await protect({ headers: { authorization: "Bearer invalid" } }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(401);
  expect(lookup).not.toHaveBeenCalled();
});

test("database outages return 503 instead of falsely invalidating a session", async () => {
  jest.spyOn(User, "findById").mockRejectedValue(new Error("database unavailable"));
  const token = jwt.sign({ id: "000000000000000000000001" }, process.env.JWT_SECRET);
  const res = response();
  const next = jest.fn();
  await protect({ headers: { authorization: `Bearer ${token}` } }, res, next);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(next).not.toHaveBeenCalled();
});

test("a deleted account cannot authenticate", async () => {
  jest.spyOn(User, "findById").mockResolvedValue(null);
  const token = jwt.sign({ id: "000000000000000000000001" }, process.env.JWT_SECRET);
  const res = response();
  await protect({ headers: { authorization: `Bearer ${token}` } }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(401);
});

test('password reset invalidates tokens from previous sessions', async () => {
  jest.spyOn(User, 'findById').mockResolvedValue({ sessionVersion: 1, emailVerified: true, status: 'active' });
  const token = jwt.sign({ id: '000000000000000000000001', sessionVersion: 0 }, process.env.JWT_SECRET);
  const res = response(); const next = jest.fn();
  await protect({ headers: { authorization: `Bearer ${token}` } }, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
