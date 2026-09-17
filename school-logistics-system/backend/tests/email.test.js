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
