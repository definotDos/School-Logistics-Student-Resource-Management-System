const { USER_STATUSES, normalizeStatus } = require("../utils/status");
const User = require("../models/User");
const { publicUser } = require("./authController");

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
		res.json({ users: users.map(publicUser) });
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
		const allowedFields = ["name", "email", "grade", "strand", "avatar"];
		if (req.body.activeCampus !== undefined) {
			if (req.user.role !== "admin") return res.status(403).json({ message: "Your account is locked to its assigned campus." });
			if (typeof req.body.activeCampus !== "string") return res.status(400).json({ message: "Active campus must be a campus name or an empty string for all campuses." });
			if (req.body.activeCampus && !await require("../models/Campus").exists({ name: req.body.activeCampus })) return res.status(400).json({ message: "Campus not found." });
			allowedFields.push("activeCampus");
		}
		const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
		if (updates.email) updates.email = updates.email.toLowerCase().trim();
		if (updates.email) {
			const existingUser = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
			if (existingUser) return res.status(409).json({ message: "That email address is already in use." });
		}
		const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: "after", runValidators: true });
		if (!user) return res.status(404).json({ message: "Your account could not be found." });
		res.json({ user: publicUser(user) });
	} catch (error) {
		res.status(500).json({ message: "Unable to update profile. Please try again." });
	}
}

async function createUser(req, res) {
	try {
		const { name, email, password, role, campus, studentId } = req.body;
		if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim()) || typeof password !== "string" || password.length < 8 || !["student", "staff", "admin"].includes(role)) return res.status(400).json({ message: "Provide a name, valid email, role, and password of at least 8 characters." });
		if (!require("../middleware/campusScope").canAccessCampus(req, { campus }) || !await require("../models/Campus").exists({ name: campus, status: "active" })) return res.status(400).json({ message: "Choose an active campus in your workspace." });
		if (role === "student" && !String(studentId || "").trim()) return res.status(400).json({ message: "Student ID is required." });
		const user = await User.create({ name, email, password: await require("bcryptjs").hash(password, 12), role, campus, studentId, emailVerified: true });
		res.status(201).json({ user: publicUser(user) });
	} catch (error) { res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "Email already exists." : "Unable to create account." }); }
}
module.exports = { getMe, getAllUsers, updateUserStatus, deleteUser, updateMe, createUser };
