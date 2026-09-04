const User = require("../models/User");
const { publicUser } = require("./authController");

async function getMe(req, res) {
	res.json({ user: publicUser(req.user) });
}

async function getAllUsers(req, res) {
	try {
		const users = await User.find().sort({ createdAt: -1 });
		res.json({ users: users.map(publicUser) });
	} catch {
		res.status(500).json({ message: "Unable to load users." });
	}
}

async function updateUserStatus(req, res) {
	try {
		if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: "You cannot suspend your own administrator account." });
		if (!["Active", "Suspended"].includes(req.body.status)) return res.status(400).json({ message: "Invalid account status." });
		const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
		if (!user) return res.status(404).json({ message: "User account was not found." });
		res.json({ user: publicUser(user) });
	} catch {
		res.status(500).json({ message: "Unable to update account status." });
	}
}

async function deleteUser(req, res) {
	try {
		if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: "You cannot delete your own administrator account." });
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
		const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
		if (updates.email) updates.email = updates.email.toLowerCase().trim();
		if (updates.email) {
			const existingUser = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
			if (existingUser) return res.status(409).json({ message: "That email address is already in use." });
		}
		const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
		if (!user) return res.status(404).json({ message: "Your account could not be found." });
		res.json({ user: publicUser(user) });
	} catch (error) {
		res.status(500).json({ message: "Unable to update profile. Please try again." });
	}
}

module.exports = { getMe, getAllUsers, updateUserStatus, deleteUser, updateMe };
