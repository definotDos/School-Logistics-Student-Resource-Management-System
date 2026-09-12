const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../config/email");

const publicUser = (user) => ({
	id: user._id,
	name: user.name,
	email: user.email,
	studentId: user.studentId,
	role: user.role,
	status: user.status,
	grade: user.grade,
	strand: user.strand,
	avatar: user.avatar,
	campus: user.campus,
	activeCampus: user.role === "admin" ? user.activeCampus : user.campus,
});

const createToken = (user, rememberMe = false) => jwt.sign({ id: user._id, role: user.role, sessionVersion: user.sessionVersion || 0 }, process.env.JWT_SECRET || "development_secret", { expiresIn: rememberMe === true ? "7d" : "8h" });
const createVerificationCode = () => String(crypto.randomInt(100000, 1000000));
const verificationExpiry = () => new Date(Date.now() + 15 * 60 * 1000);

async function signup(req, res) {
	try {
		const { name, email, password, campus, role = "student" } = req.body;
		const studentId = req.body.studentId || req.body.matricule || req.body.student_id;
		if (!name || !email || !password || !campus) return res.status(400).json({ message: "Name, email, password, and campus are required." });
		if (role === "admin") return res.status(403).json({ message: "Administrator accounts must be created by an existing administrator." });
		if (!["student", "staff"].includes(role)) return res.status(400).json({ message: "Choose a valid account type." });
		const normalizedName = name.trim();
		const normalizedEmail = email.toLowerCase().trim();
		const normalizedStudentId = studentId ? String(studentId).trim().toUpperCase() : "";
		const normalizedCampus = campus.trim();
		if (!await require("../models/Campus").exists({ name: normalizedCampus, status: "active" })) return res.status(400).json({ message: "Choose an active campus." });
		if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || typeof password !== "string" || password.length < 8) return res.status(400).json({ message: "Enter a valid email and a password of at least 8 characters." });
		if (!normalizedName || !normalizedCampus) return res.status(400).json({ message: "Name and campus cannot be empty." });
		if (role === "student" && !normalizedStudentId) return res.status(400).json({ message: "Student ID is required for student accounts." });
		if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
		if (normalizedStudentId && await User.findOne({ studentId: normalizedStudentId }).collation({ locale: "en", strength: 2 })) return res.status(409).json({ message: "That student ID is already registered." });
		const verificationCode = createVerificationCode();
		const user = await User.create({
			name: normalizedName,
			email: normalizedEmail,
			studentId: normalizedStudentId || undefined,
			campus: normalizedCampus,
			role,
			password: await bcrypt.hash(password, 12),
			emailVerified: false,
			verificationCode,
			verificationExpiresAt: verificationExpiry(),
		});
		try {
			await sendVerificationEmail(normalizedEmail, verificationCode);
		} catch (emailError) {
			await User.deleteOne({ _id: user._id });
			throw emailError;
		}
		res.status(201).json({ message: "Account created. Check your email for the verification code.", requiresVerification: true, email: normalizedEmail });
	} catch (error) {
		if (error.code === 11000) return res.status(409).json({ message: "An account with this email or ID already exists." });
		console.error("Signup error:", error);
		res.status(500).json({ message: error.message || "Unable to create account." });
	}
}

async function login(req, res) {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email: email?.toLowerCase().trim() }).select("+password");
		if (!user || !(await bcrypt.compare(password || "", user.password))) return res.status(401).json({ message: "Invalid email or password." });
		if (user.emailVerified === false) return res.status(403).json({ message: "Please verify your email before logging in.", requiresVerification: true, email: user.email });
		if (user.status === "suspended") return res.status(403).json({ message: "This account has been suspended. Contact an administrator." });
		res.json({ user: publicUser(user), token: createToken(user, req.body.rememberMe) });
	} catch (error) {
		res.status(500).json({ message: "Unable to log in." });
	}
}

async function verifyEmail(req, res) {
	try {
		const email = req.body.email?.toLowerCase().trim();
		const code = String(req.body.code || "").trim();
		const user = await User.findOne({ email }).select("+verificationCode +verificationExpiresAt");
		if (!user || user.emailVerified !== false || user.verificationCode !== code || !user.verificationExpiresAt || user.verificationExpiresAt < new Date()) return res.status(400).json({ message: "That verification code is invalid or expired." });
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
		const email = req.body.email?.toLowerCase().trim();
		if (!email) return res.status(400).json({ message: "Email is required." });
		const user = await User.findOne({ email });
		if (!user) return res.status(404).json({ message: "No account was found with that email." });
		if (user.emailVerified) return res.status(200).json({ message: "This account is already verified." });
		const verificationCode = createVerificationCode();
		user.verificationCode = verificationCode;
		user.verificationExpiresAt = verificationExpiry();
		await user.save();
		await sendVerificationEmail(email, verificationCode);
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
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
  const user = await User.findOne({ email });
  if (user) {
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
  const { email, code, password } = req.body;
  if (typeof email !== "string" || typeof code !== "string" || !/^[a-f0-9]{32}$/.test(code) || typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ message: "Enter your email, reset code, and a password of 8 to 72 bytes." });
  const user = await User.findOneAndUpdate({ email: email.trim().toLowerCase(), passwordResetHash: hashResetCode(code), passwordResetExpiresAt: { $gt: new Date() } }, { $set: { password: await bcrypt.hash(password, 12) }, $unset: { passwordResetHash: 1, passwordResetExpiresAt: 1 }, $inc: { sessionVersion: 1 } }, { new: true });
  if (!user) return res.status(400).json({ message: "That reset code is invalid or expired. Request a new code." });
  res.json({ message: "Password reset successfully. Log in with your new password." });
 } catch {
  res.status(500).json({ message: "Unable to reset your password." });
 }
}

module.exports = { signup, login, verifyEmail, resendVerificationCode, forgotPassword, resetPassword, publicUser };
