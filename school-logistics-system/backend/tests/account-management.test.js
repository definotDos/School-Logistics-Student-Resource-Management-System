const User = require('../src/models/User');
const Campus = require('../src/models/Campus');
jest.mock('../src/config/email', () => ({ sendVerificationEmail: jest.fn() }));
const mail = require('../src/config/email');
const auth = require('../src/controllers/authController');
const profile = require('../src/controllers/userController');
const emailChange = require('../src/controllers/emailChangeController');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test('student IDs normalize and use a case-insensitive unique index', () => {
  expect(new User({ studentId: ' abc-123 ' }).studentId).toBe('ABC-123');
  expect(new User({ studentId: '' }).studentId).toBeUndefined();
  expect(User.schema.indexes()).toContainEqual(expect.arrayContaining([
    { studentId: 1 }, expect.objectContaining({ unique: true, collation: { locale: 'en', strength: 2 } }),
  ]));
});
test('signup rejects duplicate student IDs before creating or emailing', async () => {
  jest.spyOn(Campus, 'exists').mockResolvedValue({});
  jest.spyOn(User, 'findOne').mockResolvedValueOnce(null).mockReturnValueOnce({ collation: jest.fn().mockResolvedValue({}) });
  const create = jest.spyOn(User, 'create'); const res = response();
  await auth.signup({ body: { name: 'Student', email: 'new@example.com', password: 'password123', campus: 'Main', studentId: 'abc' } }, res);
  expect(res.status).toHaveBeenCalledWith(409); expect(create).not.toHaveBeenCalled();
});
test('admin account creation reports student ID conflicts', async () => {
  jest.spyOn(Campus, 'exists').mockResolvedValue({});
  jest.spyOn(User, 'create').mockRejectedValue({ code: 11000, keyPattern: { studentId: 1 } });
  const res = response();
  await profile.createUser({ user: { role: 'admin' }, body: { name: 'Student', email: 'new@example.com', password: 'password123', campus: 'Main', studentId: 'abc', role: 'student' } }, res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith({ message: 'That student ID is already registered.' });
});
test('profile cannot bypass email verification', async () => {
  const update = jest.spyOn(User, 'findByIdAndUpdate'); const res = response();
  await profile.updateMe({ user: { email: 'old@example.com' }, body: { email: 'new@example.com' } }, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(update).not.toHaveBeenCalled();
});
test('email request preserves current email and stores only hashed code', async () => {
  jest.spyOn(User, 'exists').mockResolvedValue(null);
  const update = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({}); const res = response();
  await emailChange.requestEmailChange({ user: { _id: '123', email: 'old@example.com' }, body: { email: 'new@example.com' } }, res);
  const changes = update.mock.calls[0][1];
  expect(changes.email).toBeUndefined(); expect(changes.pendingEmail).toBe('new@example.com');
  expect(changes.emailChangeHash).not.toBe(mail.sendVerificationEmail.mock.calls[0][1]);
});
test('delivery failure leaves account unchanged', async () => {
  jest.spyOn(User, 'exists').mockResolvedValue(null); mail.sendVerificationEmail.mockRejectedValueOnce(new Error('offline'));
  const update = jest.spyOn(User, 'findByIdAndUpdate'); const res = response();
  await emailChange.requestEmailChange({ user: { _id: '123', email: 'old@example.com' }, body: { email: 'new@example.com' } }, res);
  expect(res.status).toHaveBeenCalledWith(503); expect(update).not.toHaveBeenCalled();
});
test('verification atomically consumes unexpired account-bound code and clears recovery', async () => {
  const update = jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue({ _id: '123' }); const res = response();
  await emailChange.confirmEmailChange({ user: { _id: '123' }, body: { email: 'new@example.com', code: 'a'.repeat(32) } }, res);
  const [filter, changes] = update.mock.calls[0];
  expect(filter._id).toBe('123'); expect(filter.emailChangeExpiresAt.$gt).toBeInstanceOf(Date);
  expect(changes.$set.emailVerified).toBe(true); expect(changes.$unset.emailChangeHash).toBe(1); expect(changes.$unset.passwordResetHash).toBe(1);
});
test('expired, reused or incorrect email codes are rejected', async () => {
  jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(null); const res = response();
  await emailChange.confirmEmailChange({ user: { _id: '123' }, body: { email: 'new@example.com', code: 'a'.repeat(32) } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
const { prepareStudentIds } = require('../src/utils/studentIds');
test('legacy duplicates stop startup before any account is changed', async () => {
 const model = { find: () => ({ select: () => ({ lean: async () => [{ _id: '1', studentId: ' abc ' }, { _id: '2', studentId: 'ABC' }] }) }), collection: { updateOne: jest.fn() }, createIndexes: jest.fn() };
 await expect(prepareStudentIds(model)).rejects.toThrow('Duplicate student ID ABC');
 expect(model.collection.updateOne).not.toHaveBeenCalled(); expect(model.createIndexes).not.toHaveBeenCalled();
});
test('legacy normalization clears blanks before creating indexes', async () => {
 const model = { find: () => ({ select: () => ({ lean: async () => [{ _id: '1', studentId: ' abc ' }, { _id: '2', studentId: '' }] }) }), collection: { updateOne: jest.fn() }, createIndexes: jest.fn() };
 await prepareStudentIds(model);
 expect(model.collection.updateOne).toHaveBeenCalledWith({ _id: '1', studentId: ' abc ' }, { $set: { studentId: 'ABC' } });
 expect(model.collection.updateOne).toHaveBeenCalledWith({ _id: '2', studentId: '' }, { $unset: { studentId: 1 } });
 expect(model.createIndexes).toHaveBeenCalled();
});
