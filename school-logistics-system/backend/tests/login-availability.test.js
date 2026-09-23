const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const correctStudentId = require('../src/controllers/studentIdController');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
afterEach(() => { jest.restoreAllMocks(); delete app.locals.accountCreationReady; });

test('existing users can log in while duplicate IDs pause signup', async () => {
  app.locals.accountCreationReady = false;
  jest.spyOn(User, 'findOneAndUpdate').mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: '123', role: 'student', emailVerified: true, status: 'active' }) });
  jest.spyOn(User, 'findOne').mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: '123', role: 'student', emailVerified: true, status: 'active', password: await bcrypt.hash('test-password', 4) }) });
  const result = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'test-password' });
  expect(result.status).toBe(200); expect(result.body.token).toBeTruthy();
  const signup = await request(app).post('/api/auth/signup').send({});
  expect(signup.status).toBe(503); expect(signup.body.message).toContain('Existing users can still log in');
});
test('ID corrections reject whitespace and case duplicates', async () => {
  const save = jest.fn();
  jest.spyOn(User, 'findById').mockResolvedValue({ _id: '123', role: 'student', campus: 'Main', save });
  jest.spyOn(User, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ studentId: ' abc ' }] }) });
  const res = response();
  await correctStudentId({ app, user: { role: 'admin' }, params: { id: '123' }, body: { studentId: 'ABC' } }, res);
  expect(res.status).toHaveBeenCalledWith(409); expect(save).not.toHaveBeenCalled();
});
test('ID corrections enforce campus scope', async () => {
  const save = jest.fn();
  jest.spyOn(User, 'findById').mockResolvedValue({ _id: '123', role: 'student', campus: 'Other', save });
  const res = response();
  await correctStudentId({ app, user: { role: 'admin', activeCampus: 'Main' }, params: { id: '123' }, body: { studentId: 'ABC' } }, res);
  expect(res.status).toHaveBeenCalledWith(403); expect(save).not.toHaveBeenCalled();
});
test('correcting final conflict restores registration after index creation', async () => {
  app.locals.accountCreationReady = false;
  const user = { _id: '123', role: 'student', campus: 'Main', save: jest.fn() };
  jest.spyOn(User, 'findById').mockResolvedValue(user);
  jest.spyOn(User, 'find').mockReturnValue({ select: () => ({ lean: async () => [] }) });
  const indexes = jest.spyOn(User, 'createIndexes').mockResolvedValue([]);
  const res = response();
  await correctStudentId({ app, user: { role: 'admin' }, params: { id: '123' }, body: { studentId: ' new-id ' } }, res);
  expect(user.studentId).toBe('NEW-ID'); expect(user.save).toHaveBeenCalled();
  expect(indexes).toHaveBeenCalled(); expect(app.locals.accountCreationReady).toBe(true);
});
