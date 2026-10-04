const { prepareEmployeeIds } = require('../src/utils/employeeIds');
const { accountFields } = require('../src/utils/accountValidation');
const User = require('../src/models/User');
const details = { name: 'Staff Member', email: 'staff@phinmaed.com', password: 'password123', campus: 'Main', role: 'staff', employeeId: 'UP-12-123-A' };
const modelFor = users => ({ find: jest.fn(() => ({ select: () => ({ lean: async () => users }) })), collection: { updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }) } });

test('staff records store only employeeId and reject studentId', async () => {
  const fields = accountFields(details);
  expect(fields.employeeId).toBe(details.employeeId);
  expect(fields).not.toHaveProperty('studentId');
  expect(() => accountFields({ ...details, studentId: details.employeeId })).toThrow();
  await expect(new User({ ...details, studentId: details.employeeId }).validate()).rejects.toThrow();
  expect(User.schema.indexes()).toContainEqual(expect.arrayContaining([{ employeeId: 1 }, expect.objectContaining({ unique: true })]));
});

test.each(['staff', 'admin'])('moves legacy %s ID and removes studentId atomically', async role => {
  const model = modelFor([{ _id: '1', role, studentId: ' up-12-123-a ' }]);
  await prepareEmployeeIds(model);
  expect(model.collection.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: '1', role, studentId: ' up-12-123-a ' }), { $set: { employeeId: 'UP-12-123-A' }, $unset: { studentId: 1 } });
});

test('already migrated accounts require no changes', async () => {
  const model = modelFor([{ _id: '1', role: 'staff', employeeId: details.employeeId }]);
  await prepareEmployeeIds(model);
  expect(model.collection.updateOne).not.toHaveBeenCalled();
});

test.each([
  [{ _id: '1', studentId: details.employeeId }, { _id: '2', employeeId: details.employeeId }],
  [{ _id: '1', studentId: details.employeeId, employeeId: 'UP-25-12345-B' }],
  [{ _id: '1', studentId: '03-2425-1234' }],
])('conflicts stop migration before any write', async users => {
  const model = modelFor(users);
  await expect(prepareEmployeeIds(model)).rejects.toThrow();
  expect(model.collection.updateOne).not.toHaveBeenCalled();
});

test('concurrent changes stop migration without overwriting the changed record', async () => {
  const model = modelFor([{ _id: '1', role: 'staff', studentId: details.employeeId }]);
  model.collection.updateOne.mockResolvedValue({ matchedCount: 0 });
  await expect(prepareEmployeeIds(model)).rejects.toThrow('Account changed');
});
