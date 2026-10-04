const User = require('../src/models/User');
const Campus = require('../src/models/Campus');
jest.mock('../src/config/email', () => ({ sendVerificationEmail: jest.fn() }));
const auth = require('../src/controllers/authController');
const users = require('../src/controllers/userController');
const emailChange = require('../src/controllers/emailChangeController');
const { accountFields, emailValid, policy } = require('../src/utils/accountValidation');
const valid = { name: 'Student Name', email: 'student@phinmaed.com', password: 'password123', studentId: '03-01-2425-23456', role: 'student', campus: 'Main', strand: 'BS Information Technology' };
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
afterEach(() => jest.restoreAllMocks());

test.each(['a@gmail.com', 'a@phinmaed.com.evil.test', 'a@sub.phinmaed.com', 'a..b@phinmaed.com', '.a@phinmaed.com', 'a@phinmaed.com\nother', { $ne: null }, ['a@phinmaed.com'], null])('rejects invalid school email %j', email => expect(emailValid(email)).toBe(false));
test('normalizes valid emails and IDs', () => {
  expect(accountFields({ ...valid, email: ' Student@PHINMAED.COM ', studentId: ' 03-01-2425-23456 ' })).toMatchObject({ email: valid.email, studentId: valid.studentId });
});
test.each([
  { email: 'a@gmail.com' }, { studentId: 'UP-25-12345-A' }, { studentId: 'STU-123' },
  { name: {} }, { name: ' ' }, { campus: [] }, { password: 'a'.repeat(73) },
  { password: '😀'.repeat(19) }, { strand: 'Other' }, { strand: '' },
  { role: 'staff' }, { role: 'admin' }, { role: { $ne: '' } }, { accountType: 'staff' },
  { studentId: { $ne: '' } }, { emailVerified: true }, { status: 'active' },
])('public signup rejects bypass payload %j before database writes', async patch => {
  const create = jest.spyOn(User, 'create'); const res = response();
  await auth.signup({ body: { ...valid, ...patch } }, res);
  expect([400, 403]).toContain(res.status.mock.calls[0][0]);
  expect(create).not.toHaveBeenCalled();
});
test.each(['staff', 'admin'])('administrator-created %s requires employee ID', role => {
  expect(() => accountFields({ ...valid, role }, true)).toThrow('ID does not match');
  const { strand, studentId, ...employee } = valid;
  expect(accountFields({ ...employee, role, employeeId: 'UP-25-12345-A' }, true).role).toBe(role);
});
test.each([{ role: 'admin' }, { studentId: 'UP-25-12345-A' }, { strand: 'Invented Course' }, { grade: 'Year 999' }, { name: [] }, { avatar: 'javascript:alert(1)' }])('profile rejects bypass payload %j', async body => {
  const update = jest.spyOn(User, 'findByIdAndUpdate'); const res = response();
  await users.updateMe({ body, user: { role: 'student', campus: 'Main' } }, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(update).not.toHaveBeenCalled();
});
test('valid course selection persists with query validation enabled', async () => {
  const update = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({ name: 'Student' });
  await users.updateMe({ body: { strand: valid.strand }, user: { _id: '123', role: 'student' } }, response());
  expect(update).toHaveBeenCalledWith('123', { strand: valid.strand }, expect.objectContaining({ runValidators: true }));
});
test.each(['requestEmailChange', 'confirmEmailChange'])('%s blocks domain bypass', async method => {
  const update = jest.spyOn(User, 'findOneAndUpdate'); const res = response();
  await emailChange[method]({ body: { email: 'a@phinmaed.com.evil.test', code: 'a'.repeat(32) }, user: { email: valid.email } }, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(update).not.toHaveBeenCalled();
});
test.each([{ email: { $ne: '' } }, { role: 'admin' }, { rememberMe: 'true' }])('login rejects malformed fields %j', async patch => {
  const lookup = jest.spyOn(User, 'findOne'); const res = response();
  await auth.login({ body: { email: valid.email, password: valid.password, ...patch } }, res);
  expect([400, 401]).toContain(res.status.mock.calls[0][0]); expect(lookup).not.toHaveBeenCalled();
});
test('administrator creation requires authenticated administrator authority', async () => {
  const create = jest.spyOn(User, 'create'); const res = response();
  await users.createUser({ user: { role: 'staff' }, body: valid }, res);
  expect(res.status).toHaveBeenCalledWith(403); expect(create).not.toHaveBeenCalled();
});
test('duplicate email is rejected before administrator creation', async () => {
  jest.spyOn(Campus, 'exists').mockResolvedValue({});
  jest.spyOn(User, 'exists').mockResolvedValue({});
  const create = jest.spyOn(User, 'create'); const res = response();
  await users.createUser({ user: { role: 'admin' }, body: valid }, res);
  expect(res.status).toHaveBeenCalledWith(409); expect(create).not.toHaveBeenCalled();
});
test('model validation rejects role/ID mismatches outside controllers', async () => {
  await expect(new User({ ...valid, role: 'admin' }).validate()).rejects.toThrow('ID must match');
  await expect(new User(valid).validate()).resolves.toBeUndefined();
});
test('all configured courses are accepted', () => {
  for (const strand of Object.values(policy.programGroups).flat()) expect(accountFields({ ...valid, strand }).strand).toBe(strand);
});
test('administrator-created employees receive verification and cannot start verified', async () => {
  jest.spyOn(Campus, 'exists').mockResolvedValue({});
  jest.spyOn(User, 'exists').mockResolvedValue(null);
  jest.spyOn(User, 'findOne').mockReturnValue({ collation: jest.fn().mockResolvedValue(null) });
  const create = jest.spyOn(User, 'create').mockResolvedValue({ _id: 'new-user', role: 'staff' });
  const res = response();
  const { strand, studentId, ...employee } = valid;
  await users.createUser({ user: { role: 'admin' }, body: { ...employee, role: 'staff', employeeId: 'UP-25-12345-A' } }, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ role: 'staff', employeeId: 'UP-25-12345-A', emailVerified: false, verificationCode: expect.stringMatching(/^\d{6}$/) }));
});
test('database defaults do not mark new accounts verified', () => {
  expect(new User(valid).emailVerified).toBe(false);
});
test('public signup can defer course selection, while administrator creation requires it', async () => {
  const details = { ...valid };
  delete details.strand;
  expect(accountFields(details)).not.toHaveProperty('strand');
  await expect(new User(details).validate()).resolves.toBeUndefined();
  expect(() => accountFields(details, true)).toThrow('Choose a supported course');
});

 test.each(['03-01-2425-00001', '03-2425-0001'])('accepts student ID %s', async studentId => {
  expect(accountFields({ ...valid, studentId }).studentId).toBe(studentId);
  await expect(new User({ ...valid, studentId }).validate()).resolves.toBeUndefined();
});
test.each(['STU-123456', '03-01-2425-1234', '03-01-2425-123456', '03-2425-123', '03-2425-12345', '03-2425-abcd', '03-01-2526-12345', ''])('rejects invalid student ID %s', studentId => {
  expect(() => accountFields({ ...valid, studentId })).toThrow();
});
