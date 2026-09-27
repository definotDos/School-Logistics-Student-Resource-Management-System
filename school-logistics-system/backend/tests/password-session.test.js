const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const protect = require('../src/middleware/authMiddleware');
const { createSessionToken, signingKey } = require('../src/utils/session');
const cleanup = require('../src/utils/removeLegacyAuthenticator');

afterEach(() => jest.restoreAllMocks());

test.each(['student', 'staff', 'admin'])('password session permits an active %s account', async role => {
  const user = { _id: '000000000000000000000001', role, status: 'active', emailVerified: true, sessionVersion: 2 };
  jest.spyOn(User, 'findById').mockResolvedValue(user);
  const token = createSessionToken(user, false);
  const claims = jwt.verify(token, signingKey());
  expect(claims.amr).toEqual(['pwd']);
  expect(claims.exp - claims.iat).toBe(8 * 60 * 60);
  const next = jest.fn();
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await protect({ headers: { authorization: `Bearer ${token}` } }, res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});

test('remember me retains the seven-day session duration', () => {
  const claims = jwt.verify(createSessionToken({ _id: 'id', role: 'student' }, true), signingKey());
  expect(claims.exp - claims.iat).toBe(7 * 24 * 60 * 60);
});

test('startup cleanup removes both generations of enrollment data and indexes', async () => {
  const collection = { updateMany: jest.fn().mockResolvedValue({}), dropIndex: jest.fn().mockRejectedValue({ code: 27 }) };
  await cleanup({ collection });
  const update = collection.updateMany.mock.calls[0][1];
  expect(update.$unset).toMatchObject({ mfaSecret: '', twoFactor: '', twoFactorEnabled: '' });
  expect(update.$unset.password).toBeUndefined();
  expect(update.$unset.sessionVersion).toBeUndefined();
  expect(collection.dropIndex.mock.calls).toEqual([['mfaChallengeHash_1'], ['twoFactor.challengeHash_1']]);
});
