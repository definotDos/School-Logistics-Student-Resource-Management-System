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
	if (transporter) return transporter;
	const smtpHost = process.env.SMTP_HOST || getDefaultSmtpConfig().host;
	const smtpUser = process.env.SMTP_USER || "";
	const smtpPass = process.env.SMTP_PASS || "";
	const placeholders = ["your-email@gmail.com", "your-real-gmail@gmail.com", "your-google-app-password", "your-email@example.com", "your-mailtrap-username", "your-mailtrap-password", "replace-with-your-google-app-password"];
	if (!smtpUser || !smtpPass || placeholders.includes(smtpUser) || placeholders.includes(smtpPass)) throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASS in backend/.env, then restart the backend.");

	transporter = nodemailer.createTransport({
		host: smtpHost,
		port: Number(process.env.SMTP_PORT || getDefaultSmtpConfig().port),
		secure: process.env.SMTP_SECURE === "true" || getDefaultSmtpConfig().secure,
		auth: { user: smtpUser, pass: smtpPass },
	});
	return transporter;
}

async function sendVerificationEmail(email, code) {
	if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("The signup email address is invalid.");
	const activeTransporter = await getTransporter();
	const result = await activeTransporter.sendMail({
		from: process.env.EMAIL_FROM || process.env.SMTP_USER,
		to: email,
		subject: "School Logistics email verification code",
		text: `Your School Logistics verification code is ${code}. It expires in 15 minutes.`,
		html: `<p>Your School Logistics verification code is:</p><p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p><p>This code expires in 15 minutes.</p>`,
	});

	return result;
}

module.exports = { sendVerificationEmail };