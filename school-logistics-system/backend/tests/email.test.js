jest.mock("nodemailer", () => ({ createTransport: jest.fn() }));

const originalEnv = { ...process.env };
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv, EMAIL_PROVIDER: "gmail", SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "587", SMTP_SECURE: "false", SMTP_USER: "sender@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" };
});
afterEach(() => { process.env = originalEnv; });

test("Gmail accepts a copied App Password with spaces and checks without sending", async () => {
  const nodemailer = require("nodemailer");
  const verify = jest.fn().mockResolvedValue(true);
  const sendMail = jest.fn();
  nodemailer.createTransport.mockReturnValue({ verify, sendMail });
  await require("../src/config/email").verifyEmailConnection();
  expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
    host: "smtp.gmail.com", port: 587, secure: false,
    auth: { user: "sender@gmail.com", pass: "abcdefghijklmnop" },
  }));
  expect(verify).toHaveBeenCalledTimes(1);
  expect(sendMail).not.toHaveBeenCalled();
});

test("verification sends the supplied code to the signup recipient", async () => {
  const sendMail = jest.fn().mockResolvedValue({ accepted: ["student@example.com"] });
  require("nodemailer").createTransport.mockReturnValue({ sendMail });
  await require("../src/config/email").sendVerificationEmail("student@example.com", "123456");
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
    to: "student@example.com", text: expect.stringContaining("123456"),
  }));
});

test("non-Gmail passwords retain their whitespace", async () => {
  process.env.SMTP_HOST = "sandbox.smtp.mailtrap.io";
  const nodemailer = require("nodemailer");
  nodemailer.createTransport.mockReturnValue({ verify: jest.fn().mockResolvedValue(true) });
  await require("../src/config/email").verifyEmailConnection();
  expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
    auth: { user: "sender@gmail.com", pass: "abcd efgh ijkl mnop" },
  }));
});

test('login email contains a five-minute code and rejects provider refusal', async () => {
  const sendMail = jest.fn().mockResolvedValueOnce({ accepted: ['student@phinmaed.com'], rejected: [] }).mockResolvedValueOnce({ accepted: [], rejected: ['student@phinmaed.com'] });
  require('nodemailer').createTransport.mockReturnValue({ sendMail });
  const { sendLoginCode } = require('../src/config/email');
  await sendLoginCode('student@phinmaed.com', '012345');
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'student@phinmaed.com', text: expect.stringContaining('five minutes') }));
  await expect(sendLoginCode('student@phinmaed.com', '012345')).rejects.toThrow('Email was not accepted');
});

test('staff email separates OTP and temporary password with activation instructions', async () => {
 const sendMail = jest.fn().mockResolvedValue({ accepted: ['staff@phinmaed.com'] });
 require('nodemailer').createTransport.mockReturnValue({ sendMail });
 await require('../src/config/email').sendVerificationEmail('staff@phinmaed.com', '123456', true, '1234567890');
 const message = sendMail.mock.calls[0][0];
 expect(message.text).toContain('OTP (6 digits): 123456\nTemporary password (10 digits): 1234567890');
 expect(message.html).toContain('OTP (6 digits):');
 expect(message.html).toContain('Temporary password (10 digits):');
 expect(message.text).toContain('new password');
 expect(message.text).toContain('15 minutes');
});

test('signup rejects a provider refusal instead of reporting a sent OTP', async () => {
 const sendMail = jest.fn().mockResolvedValue({ accepted: [], rejected: ['student@gmail.com'] });
 require('nodemailer').createTransport.mockReturnValue({ sendMail });
 await expect(require('../src/config/email').sendVerificationEmail('student@gmail.com', '123456')).rejects.toMatchObject({ code: 'EMAIL_PROVIDER_REJECTED' });
});

test.each(['123456789', '12345678901', '123456789a'])('staff email rejects malformed temporary password %s', async password => {
 const sendMail = jest.fn();
 require('nodemailer').createTransport.mockReturnValue({ sendMail });
 await expect(require('../src/config/email').sendVerificationEmail('staff@phinmaed.com', '123456', true, password)).rejects.toThrow('10-digit temporary password');
 expect(sendMail).not.toHaveBeenCalled();
});
