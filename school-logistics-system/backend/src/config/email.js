const nodemailer = require("nodemailer");

let transporter;

function getDefaultSmtpConfig() {
	const provider = (process.env.EMAIL_PROVIDER || "mailtrap").toLowerCase();
	const defaults = {
		mailtrap: {
			host: "sandbox.smtp.mailtrap.io",
			port: 2525,
			secure: false,
		},
		gmail: {
			host: "smtp.gmail.com",
			port: 587,
			secure: false,
		},
	};

	return defaults[provider] || defaults.mailtrap;
}

async function getTransporter() {
    if (process.env.EMAIL_PROVIDER?.trim().toLowerCase() === 'resend') return require('./resend');
	if (transporter) return transporter;
	const smtpHost = process.env.SMTP_HOST || getDefaultSmtpConfig().host;
	const smtpUser = (process.env.SMTP_USER || "").trim();
	// Google displays App Passwords in groups separated by spaces.
	const smtpPass = smtpHost === "smtp.gmail.com"
		? (process.env.SMTP_PASS || "").replace(/\s/g, "")
		: (process.env.SMTP_PASS || "");
	const placeholders = ["your-email@gmail.com", "your-real-gmail@gmail.com", "your-google-app-password", "your-email@example.com", "your-mailtrap-username", "your-mailtrap-password", "replace-with-your-google-app-password"];
	if (!smtpUser || !smtpPass || placeholders.includes(smtpUser) || placeholders.includes(smtpPass)) throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASS in backend/.env, then restart the backend.");

	transporter = nodemailer.createTransport({
		host: smtpHost,
		port: Number(process.env.SMTP_PORT || getDefaultSmtpConfig().port),
		secure: process.env.SMTP_SECURE === "true" || getDefaultSmtpConfig().secure,
        requireTLS: process.env.NODE_ENV === 'production',
		auth: { user: smtpUser, pass: smtpPass },
		connectionTimeout: 15000,
		greetingTimeout: 15000,
		socketTimeout: 30000,
	});
	return transporter;
}

async function sendVerificationEmail(email, code, activation = false, temporaryPassword) {
	if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("The signup email address is invalid.");
	if (activation && !/^[A-Za-z0-9_-]{24}$/.test(temporaryPassword || '')) throw new Error("A temporary password is required for staff activation.");
	const instructions = "Open the School Logistics login page and choose Activate account. Enter your email, OTP, and temporary password, then create and confirm a new password. These credentials expire in 15 minutes and can only activate your account once. If they expire, select Resend code to receive a new OTP and temporary password.";
	const activeTransporter = await getTransporter();
	const result = await activeTransporter.sendMail({
		from: process.env.EMAIL_FROM || process.env.SMTP_USER,
		to: email,
		subject: activation ? "Activate your School Logistics staff account" : "School Logistics email verification code",
		text: activation
            ? `School Logistics | Staff account setup\n\nYour OTP: ${code}\nYour pass: ${temporaryPassword}\n\n${instructions}\n\nKeep these credentials private.`
            : `Your School Logistics verification code is ${code}. It expires in 15 minutes.`,
		html: activation
            ? `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#20344a"><h2>Staff account setup</h2><p>Welcome to School Logistics. Use these credentials to activate your account.</p><table style="width:100%;background:#eef5fa;padding:16px;border-radius:8px"><tr><th style="text-align:left;padding:8px">Your OTP:</th><td style="padding:8px;font-family:monospace;font-size:20px">${code}</td></tr><tr><th style="text-align:left;padding:8px">Your pass:</th><td style="padding:8px;font-family:monospace">${temporaryPassword}</td></tr></table><h3>Activate your account</h3><p>${instructions}</p><p style="color:#526477">Keep these credentials private.</p></div>`
            : `<p>Your School Logistics verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 15 minutes.</p>`,
	});

	if (!result.accepted?.length || result.rejected?.length) {
		throw Object.assign(new Error('Email was not accepted'), { code: 'EMAIL_PROVIDER_REJECTED' });
	}
	return result;
}

async function sendPasswordResetEmail(email, code) {
 const mailer = await getTransporter();
 return mailer.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to: email,
  subject: "School Logistics password reset",
  text: `Your password reset code is ${code}. Paste it into the password recovery form. It expires in 15 minutes and can be used once. If you did not request this, ignore this email.` });
}
async function verifyEmailConnection() {
	if (process.env.EMAIL_PROVIDER?.trim().toLowerCase() === 'resend') {
		require('./resend').configuration();
		return { configurationOnly: true };
	}
	const mailer = await getTransporter();
	return mailer.verify();
}

async function sendLoginCode(email, code) {
 const mailer = await getTransporter();
 const result = await mailer.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to: email,
  subject: 'School Logistics sign-in code',
  text: `Your sign-in code is ${code}. It expires in five minutes and can be used once. Never share this code. If you did not try to sign in, change your password.` });
 if (!result.accepted?.length || result.rejected?.length) throw new Error('Email was not accepted');
}
module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendLoginCode, verifyEmailConnection };
