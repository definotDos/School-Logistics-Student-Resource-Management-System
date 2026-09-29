const User = require('../src/models/User');
const Campus = require('../src/models/Campus');
jest.mock('../src/config/email', () => ({ sendVerificationEmail: jest.fn() }));
const { sendVerificationEmail } = require('../src/config/email');
const { checkEmployeeId, signup } = require('../src/controllers/authController');
const { accountFields } = require('../src/utils/accountValidation');
const details = { name: 'Staff Member', email: 'staff@phinmaed.com', studentId: 'EMP-123456', password: 'password123', campus: 'Main', role: 'staff' };
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test.each(['', 'EMP-123', '03-2425-1234', { $ne: '' }])('ID gate rejects invalid employee ID %j without a lookup', async studentId => {
  const lookup = jest.spyOn(User, 'findOne');
  const res = response();
  await checkEmployeeId({ body: { studentId } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(lookup).not.toHaveBeenCalled();
});
test('ID gate normalizes IDs and checks availability case-insensitively', async () => {
  const collation = jest.fn().mockResolvedValue(null);
  const lookup = jest.spyOn(User, 'findOne').mockReturnValue({ collation });
  const res = response();
  await checkEmployeeId({ body: { studentId: ' emp-123456 ' } }, res);
  expect(lookup).toHaveBeenCalledWith({ studentId: details.studentId });
  expect(collation).toHaveBeenCalledWith({ locale: 'en', strength: 2 });
  expect(res.json).toHaveBeenCalledWith({ studentId: details.studentId });
});
test('ID gate rejects registered IDs', async () => {
  jest.spyOn(User, 'findOne').mockReturnValue({ collation: jest.fn().mockResolvedValue({}) });
  const res = response();
  await checkEmployeeId({ body: { studentId: details.studentId } }, res);
  expect(res.status).toHaveBeenCalledWith(409);
});
test('ID gate handles database unavailability', async () => {
  jest.spyOn(User, 'findOne').mockReturnValue({ collation: jest.fn().mockRejectedValue(new Error('offline')) });
  const res = response();
  await checkEmployeeId({ body: { studentId: details.studentId } }, res);
  expect(res.status).toHaveBeenCalledWith(503);
});
test('staff signup creates an unverified staff account and sends a code', async () => {
  jest.spyOn(Campus, 'exists').mockResolvedValue({});
  jest.spyOn(User, 'findOne').mockResolvedValueOnce(null).mockReturnValueOnce({ collation: jest.fn().mockResolvedValue(null) });
  const create = jest.spyOn(User, 'create').mockResolvedValue({ _id: 'staff' });
  const res = response();
  await signup({ body: details }, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ role: 'staff', studentId: details.studentId, emailVerified: false }));
  expect(sendVerificationEmail).toHaveBeenCalledWith(details.email, expect.stringMatching(/^\d{6}$/));
});
test('signup rechecks duplicate IDs even after the initial gate', async () => {
  jest.spyOn(Campus, 'exists').mockResolvedValue({});
  jest.spyOn(User, 'findOne').mockResolvedValueOnce(null).mockReturnValueOnce({ collation: jest.fn().mockResolvedValue({}) });
  const create = jest.spyOn(User, 'create');
  const res = response();
  await signup({ body: details }, res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(create).not.toHaveBeenCalled();
});
test('public signup still rejects administrators and mismatched IDs', () => {
  expect(() => accountFields({ ...details, role: 'admin' })).toThrow('Administrator accounts');
  expect(() => accountFields({ ...details, studentId: '03-2425-1234' })).toThrow('ID does not match');
  expect(() => accountFields({ ...details, role: 'student' })).toThrow('ID does not match');
});
