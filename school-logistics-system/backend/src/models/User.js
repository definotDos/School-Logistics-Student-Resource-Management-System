const mongoose = require("mongoose");
const { USER_STATUSES, normalizeStatus } = require("../utils/status");

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true, trim: true },
		emailVerified: { type: Boolean, default: true },
		sessionVersion: { type: Number, default: 0 },
		passwordResetHash: { type: String, select: false },
		passwordResetExpiresAt: { type: Date, select: false },
		verificationCode: { type: String, select: false },
		verificationExpiresAt: { type: Date, select: false },
		studentId: { type: String, trim: true, uppercase: true, set: value => typeof value === "string" ? value.trim().toUpperCase() || undefined : value },
        pendingEmail: { type: String, lowercase: true, trim: true, select: false },
        emailChangeHash: { type: String, select: false },
        emailChangeExpiresAt: { type: Date, select: false },
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

userSchema.index({ studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $type: "string" } }, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("User", userSchema);
