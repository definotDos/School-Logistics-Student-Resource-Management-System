const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const { login } = require('../src/controllers/authController');

const now = new Date('2026-09-23T00:00:00Z');
const account = { _id: '123', email: 'student@example.com', password: 'hash', role: 'student', emailVerified: true };
const response = () => ({ status: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), json: jest.fn() });
const lookup = user => jest.spyOn(User, 'findOne').mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
const update = user => jest.spyOn(User, 'findOneAndUpdate').mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
const attempt = async (password = 'wrong') => {
  const res = response();
  await login({ body: { email: ' Student@Example.com ', password } }, res);
  return res;
};

beforeEach(() => { jest.useFakeTimers().setSystemTime(now); });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test.each([1, 2])('failure %s returns invalid credentials without a token', async count => {
  lookup(account);
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
  update({ ...account, failedLoginAttempts: count });
  const res = await attempt();
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password.' });
  expect(User.findOne).toHaveBeenCalledWith({ email: account.email });
});

test('third failure returns the three-minute deadline and retry duration', async () => {
  lookup({ ...account, failedLoginAttempts: 2 });
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
  const lockedUntil = new Date(now.getTime() + 180000);
  update({ ...account, failedLoginAttempts: 3, loginLockedUntil: lockedUntil });
  const res = await attempt();
  expect(res.status).toHaveBeenCalledWith(423);
  expect(res.set).toHaveBeenCalledWith('Retry-After', '180');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ lockedUntil, retryAfterSeconds: 180 }));
});

test('an active lock rejects even correct credentials without extending its expiry', async () => {
  lookup({ ...account, loginLockedUntil: new Date(now.getTime() + 61000) });
  const compare = jest.spyOn(bcrypt, 'compare');
  const write = update(account);
  const res = await attempt('correct');
  expect(res.status).toHaveBeenCalledWith(423);
  expect(res.set).toHaveBeenCalledWith('Retry-After', '61');
  expect(compare).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

test('a lock created while comparing the password prevents issuing a token', async () => {
  lookup(account);
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
  update({ ...account, loginLockedUntil: new Date(now.getTime() + 180000) });
  const res = await attempt('correct');
  expect(res.status).toHaveBeenCalledWith(423);
  expect(res.json.mock.calls[0][0].token).toBeUndefined();
});

test('at the expiry boundary a correct password can log in and resets the failure count', async () => {
  lookup({ ...account, failedLoginAttempts: 3, loginLockedUntil: now });
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
  const write = update({ ...account, failedLoginAttempts: 0 });
  const res = await attempt('correct');
  expect(res.json.mock.calls[0][0].token).toBeTruthy();
  const [, pipeline, options] = write.mock.calls[0];
  expect(options).toEqual({ new: true, updatePipeline: true });
  expect(pipeline[0].$set.failedLoginAttempts.$cond[2]).toBe(0);
});

test('unknown accounts receive the normal invalid-credentials response', async () => {
  lookup(null);
  const write = update(account);
  const res = await attempt();
  expect(res.status).toHaveBeenCalledWith(401);
  expect(write).not.toHaveBeenCalled();
});
