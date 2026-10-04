jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
const originalEnv = { ...process.env };
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv, EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-private-key', EMAIL_FROM: 'School <noreply@example.com>' };
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'message-id' }) });
});
afterEach(() => { process.env = { ...originalEnv }; jest.restoreAllMocks(); });

test.each(['sendVerificationEmail', 'sendPasswordResetEmail', 'sendLoginCode'])('%s sends through HTTPS without opening SMTP', async method => {
  await require('../src/config/email')[method]('student@phinmaed.com', '012345');
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('https://api.resend.com/emails');
  expect(options.method).toBe('POST');
  expect(options.headers.Authorization).toBe('Bearer test-private-key');
  expect(options.signal).toBeDefined();
  expect(JSON.parse(options.body)).toMatchObject({ from: 'School <noreply@example.com>', to: ['student@phinmaed.com'], text: expect.stringContaining('012345') });
  expect(require('nodemailer').createTransport).not.toHaveBeenCalled();
});

test.each(['RESEND_API_KEY', 'EMAIL_FROM'])('missing %s fails before a network request', async key => {
  delete process.env[key];
  await expect(require('../src/config/email').sendLoginCode('student@phinmaed.com', '012345')).rejects.toMatchObject({ code: 'EMAIL_CONFIGURATION' });
  expect(fetch).not.toHaveBeenCalled();
});

test.each([401, 403, 429, 500])('HTTP %s rejects delivery without leaking the provider body', async status => {
  fetch.mockResolvedValue({ ok: false, status, json: async () => ({ message: 'private provider details' }) });
  await expect(require('../src/config/email').sendLoginCode('student@phinmaed.com', '012345'))
    .rejects.toMatchObject({ code: 'EMAIL_PROVIDER_REJECTED', responseCode: status, message: 'Email provider did not accept the message.' });
});

test('success without a message ID is rejected', async () => {
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  await expect(require('../src/config/email').sendLoginCode('student@phinmaed.com', '012345')).rejects.toMatchObject({ code: 'EMAIL_PROVIDER_REJECTED' });
});

test('request timeout fails without retrying or falling back to SMTP', async () => {
  fetch.mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
  await expect(require('../src/config/email').sendLoginCode('student@phinmaed.com', '012345')).rejects.toMatchObject({ code: 'ETIMEDOUT' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(require('nodemailer').createTransport).not.toHaveBeenCalled();
});

test('configuration check does not claim network verification or send mail', async () => {
  await expect(require('../src/config/email').verifyEmailConnection()).resolves.toEqual({ configurationOnly: true });
  expect(fetch).not.toHaveBeenCalled();
});
