const mongoose = require("mongoose");

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
		status: { type: String, enum: ["active", "suspended"], default: "active" },
		grade: { type: String, default: "Grade 11" },
		strand: { type: String, default: "STEM" },
		avatar: { type: String, default: "" },
		campus: { type: String, required: true, trim: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
