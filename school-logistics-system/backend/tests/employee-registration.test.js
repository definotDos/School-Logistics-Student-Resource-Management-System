const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Campus = require('../src/models/Campus');
jest.mock('../src/config/email', () => ({ sendVerificationEmail: jest.fn() }));
const { sendVerificationEmail } = require('../src/config/email');
const auth = require('../src/controllers/authController');
const details = { name: 'Campus Employee', email: 'employee@gmail.com', employeeId: 'UP-25-12345-A', password: 'password123', campus: 'Main' };
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const originalCode = process.env.ADMIN_REGISTRATION_CODE;
beforeEach(() => { process.env.ADMIN_REGISTRATION_CODE = 'test-only-registration-code'; });
afterEach(() => {
  jest.restoreAllMocks(); jest.clearAllMocks();
  if (originalCode === undefined) delete process.env.ADMIN_REGISTRATION_CODE;
  else process.env.ADMIN_REGISTRATION_CODE = originalCode;
});

test.each([undefined, '', 'wrong', { $ne: '' }])('rejects unauthorized admin registration %j before database access', async adminRegistrationCode => {
  const create = jest.spyOn(User, 'create');
  const lookup = jest.spyOn(Campus, 'exists');
  const res = response();
  await auth.signup({ body: { ...details, role: 'admin', adminRegistrationCode } }, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(create).not.toHaveBeenCalled();
  expect(lookup).not.toHaveBeenCalled();
});

test.each(['', 'short'])('unconfigured or weak admin code disables registration', async configured => {
  process.env.ADMIN_REGISTRATION_CODE = configured;
  const res = response();
  await auth.signup({ body: { ...details, role: 'admin', adminRegistrationCode: configured } }, res);
  expect(res.status).toHaveBeenCalledWith(403);
});

test.each(['admin', 'staff'])('%s registration sends OTP, rejects wrong and expired codes, then verifies once', async role => {
  jest.spyOn(Campus, 'exists').mockResolvedValue({});
  const find = jest.spyOn(User, 'findOne').mockResolvedValueOnce(null).mockReturnValueOnce({ collation: jest.fn().mockResolvedValue(null) });
  const user = { _id: role, save: jest.fn().mockResolvedValue(undefined) };
  jest.spyOn(User, 'create').mockImplementation(async fields => Object.assign(user, fields));
  const res = response();
  const body = { ...details, role, ...(role === 'admin' ? { adminRegistrationCode: process.env.ADMIN_REGISTRATION_CODE } : {}) };
  if (role === 'admin') delete body.employeeId;
  await auth.signup({ body }, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requiresVerification: true, email: details.email }));
  expect(user.emailVerified).toBe(false);
  expect(user.role).toBe(role);
  if (role === 'admin') {
    expect(user).not.toHaveProperty('employeeId');
    expect(find).toHaveBeenCalledTimes(1);
    await expect(new User({ ...details, employeeId: undefined, role }).validate()).resolves.toBeUndefined();
  }
  expect(user).not.toHaveProperty('adminRegistrationCode');
  expect(await bcrypt.compare(details.password, user.password)).toBe(true);
  expect(sendVerificationEmail).toHaveBeenCalledWith(details.email, user.verificationCode);
  find.mockReset().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
  const code = user.verificationCode;
  const invalid = response();
  await auth.verifyEmail({ body: { email: details.email, code: '000000' } }, invalid);
  expect(invalid.status).toHaveBeenCalledWith(400);
  user.verificationExpiresAt = new Date(Date.now() - 1000);
  const expired = response();
  await auth.verifyEmail({ body: { email: details.email, code } }, expired);
  expect(expired.status).toHaveBeenCalledWith(400);
  user.verificationExpiresAt = new Date(Date.now() + 60000);
  await auth.verifyEmail({ body: { email: details.email, code } }, response());
  expect(user.emailVerified).toBe(true);
  expect(user.verificationCode).toBeUndefined();
  const reused = response();
  await auth.verifyEmail({ body: { email: details.email, code } }, reused);
  expect(reused.status).toHaveBeenCalledWith(400);
});

test.each([{ password: 'short' }, { employeeId: 'invalid' }, { email: 'wrong@example.com' }, { emailVerified: true }])('authorized admin registration still validates payload %j', async patch => {
  const create = jest.spyOn(User, 'create');
  const res = response();
  await auth.signup({ body: { ...details, role: 'admin', adminRegistrationCode: process.env.ADMIN_REGISTRATION_CODE, ...patch } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(create).not.toHaveBeenCalled();
});
