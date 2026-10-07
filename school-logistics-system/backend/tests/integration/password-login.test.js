const mongoose = require('mongoose');
jest.mock('../../src/config/email', () => ({ sendLoginCode: jest.fn(async () => {}) }));
const bcrypt = require('bcryptjs');
const request = require('supertest');
const User = require('../../src/models/User');
const app = require('../../src/app');
const cleanup = require('../../src/utils/removeLegacyAuthenticator');
let user;
beforeAll(async () => { await mongoose.connect(process.env.MONGODB_URI); });
beforeEach(async () => {
  user = await User.create({ name: 'Login Test', studentId: '03-01-2425-000002',
    strand: 'BS Information Technology', email: `login-${new mongoose.Types.ObjectId()}@phinmaed.com`,
    password: await bcrypt.hash('Test-password-123', 4), campus: 'Test', emailVerified: true });
});
afterEach(async () => { if (user) await User.deleteOne({ _id: user._id }); });

test('password login requires email MFA even for previously enrolled accounts', async () => {
  await User.collection.updateOne({ _id: user._id }, { $set: { mfaEnabled: true, mfaSecret: 'retired', twoFactorEnabled: true, twoFactor: { secret: 'retired' } } });
  const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Test-password-123' });
  expect(login.status).toBe(200);
  expect(login.body.token).toBeUndefined();
  expect(login.body.requiresMfa).toBe(true);
  const code = require('../../src/config/email').sendLoginCode.mock.calls.at(-1)[1];
  const verified = await request(app).post('/api/auth/mfa/verify').send({ challenge: login.body.challenge, code });
  expect(verified.status).toBe(200);
  const profile = await request(app).get('/api/users/me').set('Authorization', `Bearer ${verified.body.token}`);
  expect(profile.status).toBe(200);
  await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
  expect((await request(app).get('/api/users/me').set('Authorization', `Bearer ${verified.body.token}`)).status).toBe(401);
});

test('retired enrollment data is removed idempotently without changing the password', async () => {
  await User.collection.updateOne({ _id: user._id }, { $set: { mfaEnabled: true, mfaSecret: 'retired', mfaChallengeHash: 'retired', twoFactorEnabled: true, twoFactor: { secret: 'retired', challengeHash: 'retired' } } });
  await cleanup(User);
  await cleanup(User);
  const stored = await User.collection.findOne({ _id: user._id });
  expect(stored.mfaEnabled).toBeUndefined();
  expect(stored.mfaSecret).toBeUndefined();
  expect(stored.mfaChallengeHash).toBeUndefined();
  expect(stored.twoFactorEnabled).toBeUndefined();
  expect(stored.twoFactor).toBeUndefined();
  expect(await bcrypt.compare('Test-password-123', stored.password)).toBe(true);
});

test.each([{ status: 'suspended' }, { emailVerified: false }])('ineligible account %j cannot sign in', async changes => {
  await User.updateOne({ _id: user._id }, { $set: changes });
  const result = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Test-password-123' });
  expect(result.status).toBe(403);
  expect(result.body.token).toBeUndefined();
});
