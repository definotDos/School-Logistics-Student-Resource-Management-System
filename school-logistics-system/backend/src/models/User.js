const mongoose = require("mongoose");
const { USER_STATUSES, normalizeStatus } = require("../utils/status");

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true, trim: true },
		emailVerified: { type: Boolean, default: true },
		verificationCode: { type: String, select: false },
		verificationExpiresAt: { type: Date, select: false },
		studentId: { type: String, trim: true },
		password: { type: String, required: true, select: false },
		role: { type: String, enum: ["student", "admin", "staff"], default: "student" },
		status: { type: String, enum: USER_STATUSES, set: normalizeStatus, default: "active" },
		grade: { type: String, default: "Please Select Your Program" },
		strand: { type: String, default: "Please Select Your Course Or Strand" },
		avatar: { type: String, default: "" },
		campus: { type: String, required: true, trim: true },
		activeCampus: { type: String, trim: true, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
