const User = require('../src/models/User');
const models = ['Request', 'Allocation', 'ClaimSchedule', 'Distribution'].map(name => require(`../src/models/${name}`));
jest.mock('../src/config/email', () => ({ sendVerificationEmail: jest.fn() }));
const { deleteUser } = require('../src/controllers/userController');
const id = 'a'.repeat(24);
let req, res;
beforeEach(() => {
  req = { params: { id }, user: { _id: 'b'.repeat(24), role: 'admin', activeCampus: 'Main' } };
  res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  jest.spyOn(User, 'findById').mockResolvedValue({ _id: id, campus: 'Main' });
  jest.spyOn(User, 'findByIdAndDelete').mockResolvedValue({ _id: id });
  models.forEach(model => jest.spyOn(model, 'exists').mockResolvedValue(null));
});
afterEach(() => jest.restoreAllMocks());
test('deletes an unlinked account and returns its ID', async () => {
  await deleteUser(req, res);
  expect(User.findByIdAndDelete).toHaveBeenCalledWith(id);
  expect(res.json).toHaveBeenCalledWith({ id, message: 'User account deleted successfully.' });
  for (const model of models) {
    const fields = model.exists.mock.calls[0][0].$or.flatMap(Object.keys);
    expect(fields.every(field => model.schema.path(field)?.options.ref === 'User')).toBe(true);
  }
});
test.each([400, 403, 404])('rejects protected or missing accounts (%s)', async status => {
  if (status === 400) req.params.id = req.user._id;
  if (status === 403) User.findById.mockResolvedValue({ campus: 'Other' });
  if (status === 404) User.findById.mockResolvedValue(null);
  await deleteUser(req, res);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(User.findByIdAndDelete).not.toHaveBeenCalled();
  expect(models[0].exists).not.toHaveBeenCalled();
});
test.each([0, 1, 2, 3])('preserves accounts referenced by workflow model %s', async index => {
  models[index].exists.mockResolvedValue({ _id: 'record' });
  await deleteUser(req, res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(User.findByIdAndDelete).not.toHaveBeenCalled();
});
test('includes cancellation history in deletion protection', async () => {
  await deleteUser(req, res);
  for (const index of [0, 2]) expect(models[index].exists).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.arrayContaining([{ cancelledBy: id }]) }));
});
test('reports database failure without claiming success', async () => {
  User.findByIdAndDelete.mockRejectedValue(new Error('offline'));
  await deleteUser(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
});
