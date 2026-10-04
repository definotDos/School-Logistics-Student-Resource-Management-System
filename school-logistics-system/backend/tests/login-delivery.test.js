jest.mock('../src/config/email', () => ({ sendLoginCode: jest.fn() }));
const User = require('../src/models/User');
const { sendLoginCode } = require('../src/config/email');
const { issue } = require('../src/services/loginFactor');

afterEach(() => jest.restoreAllMocks());

test('email timeout invalidates the challenge and logs safe diagnostics without granting access', async () => {
  jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue({});
  const update = jest.spyOn(User, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  sendLoginCode.mockRejectedValue(Object.assign(new Error('private provider details'), { code: 'ETIMEDOUT', command: 'CONN' }));
  await expect(issue({ _id: 'test-user', email: 'student@phinmaed.com' }, false))
    .rejects.toMatchObject({ status: 503 });
  expect(update).toHaveBeenCalledWith(expect.any(Object), {
    $set: { 'loginFactor.used': true, 'loginFactor.ready': false },
  });
  expect(log).toHaveBeenCalledWith(JSON.stringify({
    event: 'login_code_delivery_failed', code: 'ETIMEDOUT', command: 'CONN',
  }));
  expect(JSON.stringify(log.mock.calls)).not.toContain('student@phinmaed.com');
  expect(JSON.stringify(log.mock.calls)).not.toContain('private provider details');
});
