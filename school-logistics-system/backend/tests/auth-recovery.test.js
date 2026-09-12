const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
jest.mock('../src/config/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
const auth = require('../src/controllers/authController');
const mail = require('../src/config/email');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
afterEach(() => jest.restoreAllMocks());
test('public signup rejects administrator roles before creating an account', async () => {
 const create = jest.spyOn(User, 'create'); const res = response();
 await auth.signup({ body: { name: 'Admin', email: 'a@example.com', password: 'password123', campus: 'Main', role: 'admin' } }, res);
 expect(res.status).toHaveBeenCalledWith(403); expect(create).not.toHaveBeenCalled();
});
test.each([false, true])('remember me %s controls token duration', async rememberMe => {
 jest.spyOn(User, 'findOne').mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: '123', password: await bcrypt.hash('password123', 4), emailVerified: true, role: 'student' }) });
 const res = response(); await auth.login({ body: { email: 'a@example.com', password: 'password123', rememberMe } }, res);
 const token = jwt.decode(res.json.mock.calls[0][0].token);
 expect(token.exp - token.iat).toBe(rememberMe ? 604800 : 28800);
});
test('unverified login provides resumable email after password validation', async () => {
 jest.spyOn(User, 'findOne').mockReturnValue({ select: jest.fn().mockResolvedValue({ email: 'a@example.com', password: await bcrypt.hash('password123', 4), emailVerified: false }) });
 const res = response(); await auth.login({ body: { email: 'a@example.com', password: 'password123' } }, res);
 expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requiresVerification: true, email: 'a@example.com' }));
});
test('recovery stores only a hash and sends the secret by email', async () => {
 const user = { save: jest.fn() }; jest.spyOn(User, 'findOne').mockResolvedValue(user);
 const res = response(); await auth.forgotPassword({ body: { email: 'a@example.com' } }, res);
 const code = mail.sendPasswordResetEmail.mock.calls[0][1];
 expect(code).toMatch(/^[a-f0-9]{32}$/); expect(user.passwordResetHash).not.toBe(code);
 expect(user.passwordResetExpiresAt.getTime()).toBeGreaterThan(Date.now());
});
test('reset consumes unexpired code atomically and revokes existing sessions', async () => {
 const update = jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue({}); const res = response();
 await auth.resetPassword({ body: { email: 'a@example.com', code: 'a'.repeat(32), password: 'newpassword123' } }, res);
 const [filter, changes] = update.mock.calls[0];
 expect(filter.passwordResetExpiresAt.$gt).toBeInstanceOf(Date);
 expect(changes.$unset).toEqual({ passwordResetHash: 1, passwordResetExpiresAt: 1 });
 expect(changes.$inc.sessionVersion).toBe(1);
 expect(await bcrypt.compare('newpassword123', changes.$set.password)).toBe(true);
});
test('expired or reused reset codes are rejected', async () => {
 jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(null); const res = response();
 await auth.resetPassword({ body: { email: 'a@example.com', code: 'a'.repeat(32), password: 'newpassword123' } }, res);
 expect(res.status).toHaveBeenCalledWith(400);
});
