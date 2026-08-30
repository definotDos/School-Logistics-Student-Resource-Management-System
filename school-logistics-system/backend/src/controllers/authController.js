const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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
});

const createToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "development_secret", { expiresIn: "7d" });

async function signup(req, res) {
	try {
		const { name, email, studentId, password, campus, role = "student" } = req.body;
		if (!name || !email || !password || !studentId || !campus) return res.status(400).json({ message: "Name, ID, email, password, and campus are required." });
		if (!["student", "admin", "staff"].includes(role)) return res.status(400).json({ message: "Choose a valid account type." });
		const normalizedName = name.trim();
		const normalizedEmail = email.toLowerCase().trim();
		const normalizedStudentId = studentId.trim();
		const normalizedCampus = campus.trim();
		if (!normalizedName || !normalizedStudentId || !normalizedCampus) return res.status(400).json({ message: "Name, ID, and campus cannot be empty." });
		if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
		const user = await User.create({
			name: normalizedName,
			email: normalizedEmail,
			studentId: normalizedStudentId,
			campus: normalizedCampus,
			role,
			password: await bcrypt.hash(password, 12),
			emailVerified: true,
		});
		res.status(201).json({ user: publicUser(user), token: createToken(user) });
	} catch (error) {
		if (error.code === 11000) return res.status(409).json({ message: "An account with this email or ID already exists." });
		console.error("Signup error:", error);
		res.status(500).json({ message: "Unable to create account." });
	}
}

async function login(req, res) {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email: email?.toLowerCase().trim() }).select("+password");
		if (!user || !(await bcrypt.compare(password || "", user.password))) return res.status(401).json({ message: "Invalid email or password." });
		if (user.emailVerified === false) return res.status(403).json({ message: "Please verify your email before logging in." });
		if (user.status === "suspended") return res.status(403).json({ message: "This account has been suspended. Contact an administrator." });
		res.json({ user: publicUser(user), token: createToken(user) });
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
		res.json({ user: publicUser(user), token: createToken(user) });
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
		return res.status(200).json({ message: "Verification code is already not required for this flow." });
	} catch (error) {
		console.error("Resend verification error:", error);
		return res.status(500).json({ message: "Unable to resend verification code." });
	}
}

module.exports = { signup, login, verifyEmail, resendVerificationCode, publicUser };
