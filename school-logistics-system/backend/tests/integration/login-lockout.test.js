const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const { login } = require('../../src/controllers/authController');

let account;
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});
beforeEach(async () => {
  account = await User.create({ name: 'Lockout Test', email: `lockout-${new mongoose.Types.ObjectId()}@example.test`, password: await bcrypt.hash('correct-password', 4), campus: 'Test' });
});
afterEach(async () => {
  if (account) await User.deleteOne({ _id: account._id });
});

async function attempt(password = 'incorrect-password') {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, set: jest.fn(), json: jest.fn() };
  await login({ body: { email: account.email, password } }, res);
  return { status: res.statusCode, body: res.json.mock.calls[0][0] };
}

test('three consecutive failures lock the account, expiry restores access, and success resets failures', async () => {
  expect((await attempt()).status).toBe(401);
  expect((await attempt()).status).toBe(401);
  expect((await attempt('correct-password')).status).toBe(200);
  expect((await attempt()).status).toBe(401);
  expect((await attempt()).status).toBe(401);
  const locked = await attempt();
  expect(locked.status).toBe(423);
  expect(locked.body.retryAfterSeconds).toBe(180);
  const retry = await attempt('correct-password');
  expect(retry.status).toBe(423);
  expect(retry.body.lockedUntil).toEqual(locked.body.lockedUntil);

  await User.updateOne({ _id: account._id }, { $set: { loginLockedUntil: new Date(Date.now() - 1000) } });
  expect((await attempt()).status).toBe(401);
  const afterExpiry = await User.findById(account._id).select('+failedLoginAttempts +loginLockedUntil');
  expect(afterExpiry.failedLoginAttempts).toBe(1);
  expect(afterExpiry.loginLockedUntil).toBeUndefined();
  expect((await attempt('correct-password')).status).toBe(200);
  expect((await User.findById(account._id).select('+failedLoginAttempts')).failedLoginAttempts).toBe(0);
});

test('concurrent failures are counted atomically and do not extend the lock', async () => {
  const results = await Promise.all(Array.from({ length: 6 }, () => attempt()));
  expect(results.filter(result => result.status === 401)).toHaveLength(2);
  expect(results.filter(result => result.status === 423)).toHaveLength(4);
  const user = await User.findById(account._id).select('+failedLoginAttempts +loginLockedUntil');
  expect(user.failedLoginAttempts).toBe(3);
  for (const result of results.filter(result => result.status === 423)) {
    expect(result.body.lockedUntil).toEqual(user.loginLockedUntil);
  }
});
