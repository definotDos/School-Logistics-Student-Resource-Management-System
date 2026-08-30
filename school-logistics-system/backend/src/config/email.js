const nodemailer = require("nodemailer");

let transporter;
let etherealAccount;

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
	const hasRealSmtp = Boolean(smtpHost && smtpUser && smtpPass) && !["your-email@gmail.com", "your-google-app-password", "your-email@example.com", "your-mailtrap-username", "your-mailtrap-password", "replace-with-your-google-app-password"].includes(smtpUser) && !["your-email@gmail.com", "your-google-app-password", "your-email@example.com", "your-mailtrap-username", "your-mailtrap-password", "replace-with-your-google-app-password"].includes(smtpPass);

	if (!hasRealSmtp) {
		etherealAccount = await nodemailer.createTestAccount();
		transporter = nodemailer.createTransport({
			host: "smtp.ethereal.email",
			port: 587,
			secure: false,
			auth: { user: etherealAccount.user, pass: etherealAccount.pass },
		});
		return transporter;
	}

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
		from: process.env.EMAIL_FROM || process.env.SMTP_USER || etherealAccount?.user,
		to: email,
		subject: "School Logistics email verification code",
		text: `Your School Logistics verification code is ${code}. It expires in 15 minutes.`,
		html: `<p>Your School Logistics verification code is:</p><p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p><p>This code expires in 15 minutes.</p>`,
	});

	if (etherealAccount && result?.messageId) {
		console.log(`Verification email sent using Ethereal test account. Preview URL: https://ethereal.email/message/${result.messageId}`);
	}
	return result;
}

module.exports = { sendVerificationEmail };