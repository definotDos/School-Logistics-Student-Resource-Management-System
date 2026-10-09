const { accountFields, profileFields } = require("../utils/accountValidation");
const { USER_STATUSES, normalizeStatus } = require("../utils/status");
const User = require("../models/User");
const { publicUser } = require("./authController");
const { sendVerificationEmail } = require("../config/email");

async function getMe(req, res) {
	res.json({ user: publicUser(req.user) });
}

async function getAllUsers(req, res) {
	try {
		const filter = require("../middleware/campusScope").campusFilter(req);
		if (req.query.role) {
			if (!["student", "staff", "admin"].includes(req.query.role)) return res.status(400).json({ message: "Invalid role." });
			filter.role = req.query.role;
		}
		const users = await User.find(filter).sort({ createdAt: -1 });
		res.json({ users: users.map(publicUser), accountCreationReady: req.app?.locals.accountCreationReady !== false });
	} catch {
		res.status(500).json({ message: "Unable to load users." });
	}
}

async function updateUserStatus(req, res) {
	try {
		if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: "You cannot suspend your own administrator account." });
		const status = normalizeStatus(req.body?.status);
		if (!USER_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid account status." });
		const target = await User.findById(req.params.id);
		if (target && !require("../middleware/campusScope").canAccessCampus(req, target)) return res.status(403).json({ message: "User belongs to another campus." });
		const user = await User.findByIdAndUpdate(req.params.id, { status }, { returnDocument: "after", runValidators: true });
		if (!user) return res.status(404).json({ message: "User account was not found." });
		res.json({ user: publicUser(user) });
	} catch {
		res.status(500).json({ message: "Unable to update account status." });
	}
}

async function deleteUser(req, res) {
	try {
		if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: "You cannot delete your own administrator account." });
		const target = await User.findById(req.params.id);
		if (target && !require("../middleware/campusScope").canAccessCampus(req, target)) return res.status(403).json({ message: "User belongs to another campus." });
		for (const model of ["Request", "Allocation", "ClaimSchedule", "Distribution"]) {
			if (await require(`../models/${model}`).exists({ $or: ["student", "approvedBy", "rejectedBy", "checkedBy", "allocatedBy", "assignedStaff", "verifiedBy", "releasedBy"].map(field => ({ [field]: req.params.id })) })) return res.status(409).json({ message: "This user has workflow records. Suspend the account to preserve its history." });
		}
		const user = await User.findByIdAndDelete(req.params.id);
		if (!user) return res.status(404).json({ message: "User account was not found." });
		res.json({ message: "User account deleted successfully.", id: req.params.id });
	} catch {
		res.status(500).json({ message: "Unable to delete user account." });
	}
}

async function updateMe(req, res) {
	try {
		if (req.body.campus !== undefined && req.body.campus !== req.user.campus) {
			return res.status(403).json({ message: "Campus changes are not allowed after account creation." });
		}
		if (req.body.email !== undefined && (typeof req.body.email !== "string" || req.body.email.trim().toLowerCase() !== req.user.email)) return res.status(400).json({ message: "Verify your new email using Change email before updating it." });
        const allowedFields = ["name", "grade", "strand", "avatar"];
        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).some(key => ![...allowedFields, "email", "campus", "activeCampus"].includes(key))) return res.status(400).json({ message: "Unsupported profile field. Role and ID changes are not permitted here." });
        const validatedProfile = profileFields(req.body, req.user.role, req.user);
		if (req.body.activeCampus !== undefined) {
			if (req.user.role !== "admin") return res.status(403).json({ message: "Your account is locked to its assigned campus." });
			if (typeof req.body.activeCampus !== "string") return res.status(400).json({ message: "Active campus must be a campus name or an empty string for all campuses." });
			if (req.body.activeCampus && !await require("../models/Campus").exists({ name: req.body.activeCampus })) return res.status(400).json({ message: "Campus not found." });
			allowedFields.push("activeCampus");
		}
		const updates = { ...validatedProfile, ...(req.body.activeCampus !== undefined ? { activeCampus: req.body.activeCampus } : {}) };
		if (updates.name !== undefined && (typeof updates.name !== "string" || !updates.name.trim())) return res.status(400).json({ message: "Enter your full name." });
		const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: "after", runValidators: true });
		if (!user) return res.status(404).json({ message: "Your account could not be found." });
		res.json({ user: publicUser(user) });
	} catch (error) {
		res.status(error.status === 400 || error.name === "ValidationError" ? 400 : 500).json({ message: error.status === 400 || error.name === "ValidationError" ? error.message : "Unable to update profile. Please try again." });
	}
}

async function createUser(req, res) {
	try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Administrator access required." });
        const fields = accountFields(req.body, true);
        if (!require("../middleware/campusScope").canAccessCampus(req, fields) || !await require("../models/Campus").exists({ name: fields.campus, status: "active" })) return res.status(400).json({ message: "Choose an active campus in your workspace." });
        if (await User.exists({ email: fields.email })) return res.status(409).json({ message: "Email already exists." });
        if (await User.findOne(fields.role === 'student' ? { studentId: fields.studentId } : { employeeId: fields.employeeId }).collation({ locale: "en", strength: 2 })) return res.status(409).json({ message: "That ID is already registered." });
        const verificationCode = String(require("crypto").randomInt(100000, 1000000));
        const user = await User.create({ ...fields, activationPending: fields.role === "staff", ...(fields.role === "staff" ? {} : { password: await require("bcryptjs").hash(req.body.password, 12) }), emailVerified: false, verificationCode, verificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000) });
        try {
            await sendVerificationEmail(fields.email, verificationCode, fields.role === "staff");
        } catch {
            await User.deleteOne({ _id: user._id });
            return res.status(503).json({ message: "Verification email is unavailable. The account was not created. Try again later." });
        }

		res.status(201).json({ user: publicUser(user) });
	} catch (error) { res.status(error.code === 11000 ? 409 : error.status === 400 || error.name === "ValidationError" ? 400 : 500).json({ message: error.code === 11000 ? error.keyPattern?.employeeId ? "That employee ID is already registered." : error.keyPattern?.studentId ? "That student ID is already registered." : "Email already exists." : error.status === 400 || error.name === "ValidationError" ? error.message : "Unable to create account." }); }
}
module.exports = { getMe, getAllUsers, updateUserStatus, deleteUser, updateMe, createUser };
