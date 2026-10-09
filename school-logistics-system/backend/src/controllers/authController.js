const { accountFields, emailValid, passwordValid, idType, normalize } = require("../utils/accountValidation");
const bcrypt = require("bcryptjs");
const { authorized, createSessionToken } = require("../utils/session");
const crypto = require("crypto");
const User = require("../models/User");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../config/email");

const publicUser = (user) => ({
	id: user._id,
	name: user.name,
	email: user.email,
	...(user.role === 'student' ? { studentId: user.studentId } : { employeeId: user.employeeId }),
	role: user.role,
	status: user.status,
	grade: user.grade,
	strand: user.strand,
	avatar: user.avatar,
	campus: user.campus,
	activeCampus: user.role === "admin" ? user.activeCampus : user.campus,
});

const createVerificationCode = () => String(crypto.randomInt(100000, 1000000));
const verificationExpiry = () => new Date(Date.now() + 15 * 60 * 1000);

async function checkEmployeeId(req, res) {
    if (Object.keys(req.body || {}).some(key => key !== 'employeeId') || idType(req.body?.employeeId) !== 'employee') {
        return res.status(400).json({ message: 'Enter an employee ID with UP-, 2 digits, 3 to 5 digits, and one letter (A-Z), separated by hyphens. Example: UP-25-12345-A.' });
    }
    const employeeId = normalize(req.body.employeeId).toUpperCase();
    try {
        if (await User.findOne({ employeeId }).collation({ locale: 'en', strength: 2 })) {
            return res.status(409).json({ message: 'That employee ID is already registered. Log in or contact your administrator.' });
        }
        return res.json({ employeeId });
    } catch {
        return res.status(503).json({ message: 'Unable to check your employee ID. Please try again.' });
    }
}

async function signup(req, res) {
	try {
        const fields = accountFields(req.body);
        const { email: normalizedEmail } = fields;
        if (!await require("../models/Campus").exists({ name: fields.campus, status: "active" })) return res.status(400).json({ message: "Choose an active campus." });
        if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
        if (await User.findOne(fields.role === 'student' ? { studentId: fields.studentId } : { employeeId: fields.employeeId }).collation({ locale: "en", strength: 2 })) return res.status(409).json({ message: "That ID is already registered." });
		const verificationCode = createVerificationCode();
		const user = await User.create({
            ...fields,
            password: await bcrypt.hash(req.body.password, 12),
			emailVerified: false,
			verificationCode,
			verificationExpiresAt: verificationExpiry(),
		});
		try {
			await sendVerificationEmail(normalizedEmail, verificationCode);
		} catch (emailError) {
			await User.deleteOne({ _id: user._id });
			console.error("Signup email delivery failed:", emailError.code || "EMAIL_CONFIGURATION");
			return res.status(503).json({ message: "Verification email is unavailable. Your account was not created. Please contact your administrator, then try again." });
		}
		res.status(201).json({ message: "Account created. Check your email for the verification code.", requiresVerification: true, email: normalizedEmail });
	} catch (error) {
		if ([400, 403].includes(error.status) || error.name === "ValidationError") return res.status(error.status || 400).json({ message: error.message });
		if (error.code === 11000) return res.status(409).json({ message: "An account with this email or ID already exists." });
		console.error("Signup error:", error);
		res.status(500).json({ message: "Unable to create account." });
	}
}

async function login(req, res) {
	try {
		const { email, password } = req.body || {};
        if (Object.keys(req.body || {}).some(key => !["email", "password", "rememberMe"].includes(key)) || (req.body?.rememberMe !== undefined && typeof req.body.rememberMe !== "boolean")) return res.status(400).json({ message: "Provide email, password, and an optional boolean rememberMe value. Account roles are determined by the server." });
		if (!emailValid(email) || typeof password !== "string" || !password || Buffer.byteLength(password) > 72) return res.status(401).json({ message: "Invalid email or password." });
		let user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password +failedLoginAttempts +loginLockedUntil");
		if (!user || user.activationPending) return res.status(401).json({ message: "Invalid email or password. If your administrator created your account, choose Activate account first." });
        req.authAuditUser = String(user._id);
		const lockedResponse = account => {
			const retryAfterSeconds = Math.max(1, Math.ceil((new Date(account.loginLockedUntil).getTime() - Date.now()) / 1000));
			res.set("Retry-After", String(retryAfterSeconds));
			return res.status(423).json({ message: "Account locked after 3 incorrect attempts. Please wait before trying again.", lockedUntil: account.loginLockedUntil, retryAfterSeconds });
		};
		if (user.loginLockedUntil > new Date()) return lockedResponse(user);
		const validPassword = await bcrypt.compare(password, user.password);
        const suspicious = Boolean(user.failedLoginAttempts || user.loginLockedUntil);
		// One atomic update serializes concurrent attempts and never extends an active lock.
		const activeLock = { $gt: [{ $ifNull: ["$loginLockedUntil", new Date(0)] }, "$$NOW"] };
		const previousAttempts = { $cond: [{ $and: [{ $ne: [{ $ifNull: ["$loginLockedUntil", null] }, null] }, { $lte: ["$loginLockedUntil", "$$NOW"] }] }, 0, { $ifNull: ["$failedLoginAttempts", 0] }] };
		const nextAttempts = validPassword ? 0 : { $add: [previousAttempts, 1] };
		user = await User.findOneAndUpdate({ _id: user._id, $expr: { $eq: [{ $ifNull: ["$sessionVersion", 0] }, user.sessionVersion || 0] } }, [
			{ $set: { failedLoginAttempts: { $cond: [activeLock, "$failedLoginAttempts", nextAttempts] } } },
			{ $set: { loginLockedUntil: { $cond: [activeLock, "$loginLockedUntil", { $cond: [{ $gte: ["$failedLoginAttempts", 3] }, { $add: ["$$NOW", 3 * 60 * 1000] }, "$$REMOVE"] }] } } },
		], { returnDocument: 'after', updatePipeline: true }).select("+failedLoginAttempts +loginLockedUntil");
		if (!user || user.activationPending) return res.status(401).json({ message: "Invalid email or password. If your administrator created your account, choose Activate account first." });
		if (user.loginLockedUntil > new Date()) return lockedResponse(user);
		if (!validPassword) return res.status(401).json({ message: "Invalid email or password." });
		if (user.emailVerified === false) return res.status(403).json({ message: "Please verify your email before logging in.", requiresVerification: true, email: user.email });
		if (!authorized(user)) return res.status(403).json({ message: "Unable to sign in with this account." });
        if (!suspicious && await require('../services/trustedDevices').validate(req, user)) {
            return res.json({ user: publicUser(user), token: createSessionToken(user, req.body.rememberMe, 'device') });
        }
        return res.json(await require('../services/loginFactor').issue(user, req.body.rememberMe));
	} catch (error) {
        console.error(JSON.stringify({ event: 'login_error', name: error.name, code: error.code, status: error.status }));
        const status = [409, 423, 429].includes(error.status) ? error.status : 503;
        res.status(status).json({ message: status === 429 ? 'Please wait 60 seconds before signing in again.' : status === 409 ? 'Login changed. Please try again.' : 'Sign-in or email delivery is temporarily unavailable. Please try again shortly.' });
	}
}

async function verifyEmail(req, res) {
	try {
		const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        if (!emailValid(email)) return res.status(400).json({ message: "Use a valid @phinmaed.com email address." });
		const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
        if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: "Enter the six-digit verification code." });
		const user = await User.findOne({ email }).select("+verificationCode +verificationExpiresAt");
		if (!user || user.activationPending || user.emailVerified !== false || user.verificationCode !== code || !user.verificationExpiresAt || user.verificationExpiresAt < new Date()) return res.status(400).json({ message: "That verification code is invalid or expired." });
		user.emailVerified = true;
		user.verificationCode = undefined;
		user.verificationExpiresAt = undefined;
		await user.save();
		res.json({ message: "Email verified successfully. You can now log in." });
	} catch {
		res.status(500).json({ message: "Unable to verify this email." });
	}
}

async function resendVerificationCode(req, res) {
	try {
		const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        if (!emailValid(email)) return res.status(400).json({ message: "Use a valid @phinmaed.com email address." });
		if (!email) return res.status(400).json({ message: "Email is required." });
		const user = await User.findOne({ email });
		if (!user) return res.status(404).json({ message: "No account was found with that email." });
		if (user.emailVerified) return res.status(200).json({ message: "This account is already verified." });
		const verificationCode = createVerificationCode();
		user.verificationCode = verificationCode;
		user.verificationExpiresAt = verificationExpiry();
		await user.save();
		await sendVerificationEmail(email, verificationCode, user.activationPending === true);
		return res.status(200).json({ message: "A new verification code was sent to your email." });
	} catch (error) {
		console.error("Resend verification error:", error);
		return res.status(500).json({ message: "Unable to resend verification code." });
	}
}

const hashResetCode = code => crypto.createHash("sha256").update(code).digest("hex");

async function forgotPassword(req, res) {
 try {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!emailValid(email)) return res.status(400).json({ message: "Enter a valid email address." });
  const user = await User.findOne({ email });
  if (user && !user.activationPending) {
   const code = crypto.randomBytes(16).toString("hex");
   user.passwordResetHash = hashResetCode(code);
   user.passwordResetExpiresAt = verificationExpiry();
   await user.save();
   await sendPasswordResetEmail(email, code);
  }
  res.json({ message: "If an account exists, a reset code has been sent. It expires in 15 minutes." });
 } catch {
  res.status(503).json({ message: "Password recovery is temporarily unavailable. Please try again later." });
 }
}

async function resetPassword(req, res) {
 try {
  const { email, code, password } = req.body || {};
  if (!emailValid(email) || typeof code !== "string" || !/^[a-f0-9]{32}$/.test(code) || !passwordValid(password)) return res.status(400).json({ message: "Enter your email, reset code, and a password of 8 to 72 bytes." });
  const user = await User.findOneAndUpdate({ email: email.trim().toLowerCase(), activationPending: { $ne: true }, passwordResetHash: hashResetCode(code), passwordResetExpiresAt: { $gt: new Date() } }, { $set: { password: await bcrypt.hash(password, 12) }, $unset: { passwordResetHash: 1, passwordResetExpiresAt: 1 }, $inc: { sessionVersion: 1 } }, { returnDocument: 'after' });
  if (!user) return res.status(400).json({ message: "That reset code is invalid or expired. Request a new code." });
  res.json({ message: "Password reset successfully. Log in with your new password." });
 } catch {
  res.status(500).json({ message: "Unable to reset your password." });
 }
}


// Consume the code and set the initial password in the same atomic update.
async function activateAccount(req, res) {
 try {
  const { email, code, password, confirmPassword } = req.body || {};
  if (!emailValid(email) || typeof code !== 'string' || !/^\d{6}$/.test(code.trim()) || !passwordValid(password) || password !== confirmPassword) {
   return res.status(400).json({ message: 'Enter your email, six-digit code, and matching passwords of at least 8 characters and at most 72 UTF-8 bytes.' });
  }
  const user = await User.findOneAndUpdate({ email: email.trim().toLowerCase(), role: 'staff', activationPending: true, emailVerified: false,
   verificationCode: code.trim(), verificationExpiresAt: { $gt: new Date() } }, {
   $set: { password: await bcrypt.hash(password, 12), emailVerified: true, activationPending: false },
   $unset: { verificationCode: 1, verificationExpiresAt: 1, passwordResetHash: 1, passwordResetExpiresAt: 1, loginLockedUntil: 1 },
   $inc: { sessionVersion: 1 },
  }, { returnDocument: 'after' });
  if (!user) return res.status(400).json({ message: 'The activation code is invalid or expired, or this account is already activated. Request a new code or log in.' });
  res.json({ message: 'Account activated. You can now log in with your new password.' });
 } catch {
  res.status(503).json({ message: 'Unable to activate your account. Please try again.' });
 }
}
module.exports = { signup, checkEmployeeId, login, verifyEmail, resendVerificationCode, forgotPassword, resetPassword, activateAccount, publicUser };
