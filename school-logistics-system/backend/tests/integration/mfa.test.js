jest.mock('../../src/config/email', () => ({ sendLoginCode: jest.fn(async () => {}), sendVerificationEmail: jest.fn(async () => {}) }));
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Device = require('../../src/models/TrustedDevice');
const { connectTestDatabase } = require('../helpers/database');
const { sendLoginCode } = require('../../src/config/email');
const { codeHash, hash } = require('../../src/services/loginFactor');
let user, clientNumber = 0;
beforeAll(async () => { await connectTestDatabase(); app.set('trust proxy', 'loopback'); });
beforeEach(async () => {
  clientNumber++;
  sendLoginCode.mockReset().mockResolvedValue(undefined);
  user = await User.create({ name: 'MFA Test', email: `mfa-${new mongoose.Types.ObjectId()}@phinmaed.com`,
    studentId: `03-01-2425-${String(clientNumber).padStart(5, '0')}`, strand: 'BS Information Technology',
    password: await bcrypt.hash('Test-password-123', 4), campus: 'Test', emailVerified: true });
});
afterEach(async () => { await Device.deleteMany({ user: user._id }); await User.deleteOne({ _id: user._id }); });
const api = (method, path) => request(app)[method](`/api${path}`).set('X-Forwarded-For', `192.0.2.${clientNumber}`).set('User-Agent', 'MFA Test Browser');
const login = cookie => { const req = api('post', '/auth/login'); if (cookie) req.set('Cookie', cookie); return req.send({ email: user.email, password: 'Test-password-123' }); };
async function begin() {
  const response = await login();
  expect(response.status).toBe(200);
  expect(response.body.token).toBeUndefined();
  return { ...response.body, code: sendLoginCode.mock.calls.at(-1)[1] };
}
const verify = (pending, extra = {}) => api('post', '/auth/mfa/verify').send({ challenge: pending.challenge, code: pending.code, ...extra });
const cooldown = () => User.updateOne({ _id: user._id }, { $set: { 'loginFactor.resendAt': new Date(0) } });

test.each(['student', 'staff', 'admin'])('%s login requires MFA and then grants protected access', async role => {
  await User.collection.updateOne({ _id: user._id }, { $set: { role } });
  const pending = await begin();
  expect((await api('get', '/users/me')).status).toBe(401);
  expect((await api('get', '/users/me').set('Authorization', `Bearer ${pending.challenge}`)).status).toBe(401);
  const stored = await User.findById(user._id).select('+loginFactor');
  expect(stored.loginFactor.codeHash).toBe(codeHash(pending.challenge, pending.code));
  expect(stored.loginFactor.challengeHash).toBe(hash(pending.challenge));
  expect(JSON.stringify(stored.loginFactor)).not.toContain(`"${pending.code}"`);
  const result = await verify(pending);
  expect(result.status).toBe(200);
  expect(result.body.user.role).toBe(role);
  expect(jwt.verify(result.body.token, process.env.JWT_SECRET).amr).toEqual(['pwd', 'otp']);
  expect((await api('get', '/users/me').set('Authorization', `Bearer ${result.body.token}`)).status).toBe(200);
  if (role === 'student') expect((await api('get', '/users/all').set('Authorization', `Bearer ${result.body.token}`)).status).toBe(403);
  expect((await verify(pending)).status).toBe(400);
});
test('incorrect password and unknown user produce generic errors without email', async () => {
  for (const body of [{ email: user.email, password: 'wrong' }, { email: 'absent@phinmaed.com', password: 'wrong' }]) {
    const result = await api('post', '/auth/login').send(body);
    expect(result.status).toBe(401); expect(result.body.message).toBe('Invalid email or password.');
  }
  expect(sendLoginCode).not.toHaveBeenCalled();
});
test('registration and email verification feed into mandatory login MFA', async () => {
  const Campus = require('../../src/models/Campus');
  const campus = await Campus.create({ name: `Registration-${user._id}` });
  const email = `registration-${user._id}@phinmaed.com`;
  try {
    const registered = await api('post', '/auth/signup').send({ name: 'New Student', email, password: 'Test-password-123',
      campus: campus.name, studentId: '03-01-2425-99990', strand: 'BS Information Technology', grade: '1st Year', role: 'student' });
    expect(registered.status).toBe(201); expect(registered.body.token).toBeUndefined();
    const signupCode = require('../../src/config/email').sendVerificationEmail.mock.calls.at(-1)[1];
    expect((await api('post', '/auth/verify-email').send({ email, code: signupCode })).status).toBe(200);
    const pending = await api('post', '/auth/login').send({ email, password: 'Test-password-123' });
    expect(pending.body.requiresMfa).toBe(true); expect(pending.body.token).toBeUndefined();
    const verified = await verify({ ...pending.body, code: sendLoginCode.mock.calls.at(-1)[1] });
    expect(verified.status).toBe(200);
    expect((await api('get', '/users/me').set('Authorization', `Bearer ${verified.body.token}`)).body.user.email).toBe(email);
  } finally { await User.deleteMany({ email }); await Campus.deleteOne({ _id: campus._id }); }
});
test('five wrong codes exhaust a challenge, including the correct sixth attempt', async () => {
  const pending = await begin();
  const wrong = pending.code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) expect((await verify(pending, { code: wrong })).status).toBe(400);
  expect((await verify(pending)).status).toBe(400);
  expect((await User.findById(user._id).select('+loginFactor')).loginFactor.attempts).toBe(5);
});
test('expired code is rejected; resend replaces challenge and resets deadline', async () => {
  const pending = await begin();
  expect((await api('post', '/auth/mfa/resend').send({ challenge: pending.challenge })).status).toBe(429);
  await User.updateOne({ _id: user._id }, { $set: { 'loginFactor.expiresAt': new Date(Date.now() - 1000) } });
  expect((await verify(pending)).status).toBe(400);
  await cooldown();
  const renewed = await api('post', '/auth/mfa/resend').send({ challenge: pending.challenge });
  expect(renewed.status).toBe(200);
  expect(renewed.body.challenge).not.toBe(pending.challenge);
  expect((await verify(pending)).status).toBe(400);
  expect((await verify({ ...renewed.body, code: sendLoginCode.mock.calls.at(-1)[1] })).status).toBe(200);
});
test('simultaneous verification consumes a code only once', async () => {
  const pending = await begin();
  const results = await Promise.all([verify(pending), verify(pending)]);
  expect(results.map(result => result.status).sort()).toEqual([200, 400]);
});
test('simultaneous resends deliver one replacement', async () => {
  const pending = await begin(); await cooldown();
  const results = await Promise.all([1, 2].map(() => api('post', '/auth/mfa/resend').send({ challenge: pending.challenge })));
  expect(results.map(result => result.status).sort()).toEqual([200, 429]);
  expect(sendLoginCode).toHaveBeenCalledTimes(2);
});
test('email delivery failure fails closed and consumes the undelivered challenge', async () => {
  sendLoginCode.mockRejectedValueOnce(new Error('Provider unavailable'));
  const result = await login();
  expect(result.status).toBe(503); expect(result.body.token).toBeUndefined(); expect(result.body.challenge).toBeUndefined();
  const stored = await User.findById(user._id).select('+loginFactor');
  expect(stored.loginFactor.used).toBe(true); expect(stored.loginFactor.ready).toBe(false);
});
test('trusted cookie is secure, skips OTP after password, and can be revoked', async () => {
  const verified = await verify(await begin(), { rememberDevice: true });
  expect(verified.status).toBe(200);
  const cookie = verified.headers['set-cookie'][0];
  for (const flag of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/']) expect(cookie).toContain(flag);
  const value = cookie.split(';')[0];
  const device = await Device.findOne({ user: user._id }).select('+tokenHash');
  expect(device.tokenHash).toBe(hash(value.split('=')[1]));
  const trusted = await login(value);
  expect(trusted.body.token).toEqual(expect.any(String));
  expect(jwt.verify(trusted.body.token, process.env.JWT_SECRET).amr).toContain('device');
  expect(sendLoginCode).toHaveBeenCalledTimes(1);
  const listed = await api('get', '/auth/devices').set('Authorization', `Bearer ${verified.body.token}`);
  expect(listed.body.devices).toHaveLength(1); expect(listed.body.devices[0].tokenHash).toBeUndefined();
  expect((await api('delete', '/auth/devices').set('Authorization', `Bearer ${verified.body.token}`)).status).toBe(200);
  await cooldown();
  expect((await login(value)).body.requiresMfa).toBe(true);
});
test.each(['expired', 'fingerprint', 'version', 'email', 'failedPassword'])('%s trusted device requires OTP again', async scenario => {
  const verified = await verify(await begin(), { rememberDevice: true });
  const cookie = verified.headers['set-cookie'][0].split(';')[0];
  if (scenario === 'expired') await Device.updateMany({ user: user._id }, { $set: { expiresAt: new Date(0) } });
  if (scenario === 'fingerprint') await Device.updateMany({ user: user._id }, { $set: { fingerprint: 'different' } });
  if (scenario === 'version') await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
  if (scenario === 'email') await Device.updateMany({ user: user._id }, { $set: { emailHash: 'old-address' } });
  if (scenario === 'failedPassword') await api('post', '/auth/login').send({ email: user.email, password: 'wrong' });
  await cooldown();
  expect((await login(cookie)).body.requiresMfa).toBe(true);
});
test.each([{ status: 'suspended' }, { role: 'forged' }, { sessionVersion: 1 }, { emailVerified: false }])('changed account eligibility %j invalidates pending MFA', async change => {
  const pending = await begin();
  await User.collection.updateOne({ _id: user._id }, { $set: change });
  expect((await verify(pending)).status).toBe(400);
});
test('legacy password-only session cannot access any protected API', async () => {
  const token = jwt.sign({ id: user._id, amr: ['pwd'], purpose: 'session' }, process.env.JWT_SECRET,
    { issuer: 'school-logistics', audience: 'school-logistics-api', expiresIn: '1h' });
  for (const path of ['/users/me', '/requests', '/resources', '/inventory', '/distribution', '/reports', '/allocations', '/notifications', '/campuses', '/search']) {
    expect((await api('get', path).set('Authorization', `Bearer ${token}`)).status).toBe(401);
  }
});
test('logout revokes server session and device trust', async () => {
  const verified = await verify(await begin(), { rememberDevice: true });
  const cookie = verified.headers['set-cookie'][0].split(';')[0];
  expect((await api('post', '/auth/logout').set('Authorization', `Bearer ${verified.body.token}`).send({})).status).toBe(200);
  expect((await api('get', '/users/me').set('Authorization', `Bearer ${verified.body.token}`)).status).toBe(401);
  expect((await login(cookie)).body.requiresMfa).toBe(true);
});
test('cross-origin mutations and malformed MFA inputs are rejected', async () => {
  expect((await api('post', '/auth/login').set('Origin', 'https://attacker.example').send({})).status).toBe(403);
  for (const body of [{ challenge: {} }, { challenge: 'a'.repeat(64), code: '1234567' }, { challenge: 'a'.repeat(64), code: '123456', rememberDevice: 'yes' }]) {
    expect((await api('post', '/auth/mfa/verify').send(body)).status).toBe(400);
  }
});
test('client rate limit prevents sustained guessing', async () => {
  for (let i = 0; i < 30; i++) await api('post', '/auth/mfa/verify').send({});
  expect((await api('post', '/auth/mfa/verify').send({})).status).toBe(429);
});
