const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
jest.mock('../src/config/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
const auth = require('../src/controllers/authController');
const mail = require('../src/config/email');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const body = { temporaryPassword: 'Abcdefghijklmnopqrstuv12', email: 'staff@phinmaed.com', code: '123456', password: 'staffpassword123', confirmPassword: 'staffpassword123' };
afterEach(() => jest.restoreAllMocks());
test('admin creates staff without a password and emails activation instructions', async () => {
 jest.spyOn(require('../src/models/Campus'), 'exists').mockResolvedValue({});
 jest.spyOn(User, 'exists').mockResolvedValue(null);
 jest.spyOn(User, 'findOne').mockReturnValue({ collation: jest.fn().mockResolvedValue(null) });
 const create = jest.spyOn(User, 'create').mockImplementation(async fields => ({ ...fields, _id: 'new' }));
 const res = response();
 await require('../src/controllers/userController').createUser({ user: { role: 'admin' }, body: { name: 'Staff Member', email: body.email, employeeId: 'UP-25-12345-A', campus: 'Main', role: 'staff' } }, res);
 expect(res.status).toHaveBeenCalledWith(201);
 expect(create.mock.calls[0][0]).toMatchObject({ activationPending: true, emailVerified: false });
 expect(create.mock.calls[0][0]).not.toHaveProperty('password');
 const secret = mail.sendVerificationEmail.mock.calls.at(-1)[3];
 expect(create.mock.calls[0][0].temporaryPasswordHash).toBe(require('crypto').createHash('sha256').update(secret).digest('hex'));
 expect(res.json.mock.calls[0][0].user).not.toHaveProperty('temporaryPasswordHash');
 expect(mail.sendVerificationEmail).toHaveBeenCalledWith(body.email, expect.stringMatching(/^\d{6}$/), true, expect.stringMatching(/^[A-Za-z0-9_-]{24}$/));
});
test('activation atomically verifies email, hashes password and consumes the unexpired code', async () => {
 const update = jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue({});
 const res = response(); await auth.activateAccount({ body }, res);
 const [filter, changes] = update.mock.calls[0];
 expect(filter).toMatchObject({ role: 'staff', activationPending: true, emailVerified: false, verificationCode: body.code });
 expect(filter.temporaryPasswordHash).toBe(require('crypto').createHash('sha256').update(body.temporaryPassword).digest('hex'));
 expect(changes.$unset.temporaryPasswordHash).toBe(1);
 expect(filter.verificationExpiresAt.$gt).toBeInstanceOf(Date);
 expect(changes.$set).toMatchObject({ emailVerified: true, activationPending: false });
 expect(await bcrypt.compare(body.password, changes.$set.password)).toBe(true);
 expect(changes.$unset.verificationCode).toBe(1);
 expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('Account activated') });
});
test.each([{ temporaryPassword: '' }, { password: body.temporaryPassword, confirmPassword: body.temporaryPassword }, { confirmPassword: 'different' }, { password: 'short', confirmPassword: 'short' }, { code: 'bad' }, { email: 'bad' }])('rejects invalid activation input %j', async fields => {
 const update = jest.spyOn(User, 'findOneAndUpdate'); const res = response();
 await auth.activateAccount({ body: { ...body, ...fields } }, res);
 expect(res.status).toHaveBeenCalledWith(400); expect(update).not.toHaveBeenCalled();
});
test('expired, consumed or mismatched activation is rejected', async () => {
 jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(null); const res = response();
 await auth.activateAccount({ body }, res); expect(res.status).toHaveBeenCalledWith(400);
});
test('ordinary verification cannot bypass password activation', async () => {
 const save = jest.fn();
 jest.spyOn(User, 'findOne').mockReturnValue({ select: jest.fn().mockResolvedValue({ activationPending: true, emailVerified: false, verificationCode: body.code, verificationExpiresAt: new Date(Date.now() + 60000), save }) });
 const res = response(); await auth.verifyEmail({ body }, res);
 expect(res.status).toHaveBeenCalledWith(400); expect(save).not.toHaveBeenCalled();
});
test('pending staff cannot log in or request a password reset', async () => {
 jest.spyOn(User, 'findOne').mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ activationPending: true }) }).mockResolvedValueOnce({ activationPending: true });
 const res = response(); await auth.login({ body: { email: body.email, password: body.password } }, res);
 expect(res.status).toHaveBeenCalledWith(401);
 await auth.forgotPassword({ body: { email: body.email } }, response());
 expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
});
test('resend preserves the staff activation instructions', async () => {
 const user = { activationPending: true, emailVerified: false, temporaryPasswordHash: 'old-hash', save: jest.fn() };
 jest.spyOn(User, 'findOne').mockResolvedValue(user);
 await auth.resendVerificationCode({ body: { email: body.email } }, response());
 const secret = mail.sendVerificationEmail.mock.calls.at(-1)[3];
 expect(user.temporaryPasswordHash).toBe(require('crypto').createHash('sha256').update(secret).digest('hex'));
 expect(user.save).toHaveBeenCalled();
 expect(mail.sendVerificationEmail).toHaveBeenCalledWith(body.email, expect.stringMatching(/^\d{6}$/), true, expect.stringMatching(/^[A-Za-z0-9_-]{24}$/));
});
test('pending staff schema permits missing password but ordinary accounts require one', () => {
 const fields = { name: 'Staff Member', email: body.email, employeeId: 'UP-25-12345-A', campus: 'Main', role: 'staff' };
 expect(new User({ ...fields, activationPending: true }).validateSync()).toBeUndefined();
 expect(new User(fields).validateSync().errors.password).toBeDefined();
});

test.each(['Maria2 Cruz', 'Maria\u0662 Cruz', 'Maria\uff12 Cruz'])('rejects numeric names: %s', async name => {
 const create = jest.spyOn(User, 'create');
 const res = response();
 await require('../src/controllers/userController').createUser({ user: { role: 'admin' }, body: { name, email: body.email, employeeId: 'UP-25-12345-A', campus: 'Main', role: 'staff' } }, res);
 expect(res.status).toHaveBeenCalledWith(400);
 expect(create).not.toHaveBeenCalled();
});
test.each(["Mar\u00eda O\u2019Connor", 'Jean-Luc Santos'])('accepts names with accents and punctuation: %s', name => {
 expect(require('../src/utils/accountValidation').profileFields({ name }, 'staff')).toEqual({ name });
});
