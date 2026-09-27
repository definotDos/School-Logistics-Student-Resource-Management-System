const mongoose = require("mongoose");
const { USER_STATUSES, normalizeStatus } = require("../utils/status");
const { emailValid, idType, courses, policy } = require("../utils/accountValidation");

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
		email: { type: String, required: true, unique: true, lowercase: true, trim: true, validate: { validator: emailValid, message: "Use a valid @phinmaed.com email address." } },
		emailVerified: { type: Boolean, default: false },
		sessionVersion: { type: Number, default: 0 },
		failedLoginAttempts: { type: Number, default: 0, select: false },
		loginLockedUntil: { type: Date, select: false },
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

// Check related fields together; a valid prefix is never proof of staff authority.
userSchema.pre('validate', function () {
  if (this.isNew || this.isModified('studentId') || this.isModified('role')) {
    const type = idType(this.studentId);
    if (!type || (this.role === 'student') !== (type === 'student')) this.invalidate('studentId', 'ID must match the account role. ' + policy.idHelp);
  }
  if (this.isModified('strand')) {
    if (this.role === 'student' && !courses.includes(this.strand)) this.invalidate('strand', 'Choose a supported course or strand.');
  }
  if (this.isModified('grade') && !policy.grades.includes(this.grade)) this.invalidate('grade', 'Choose a valid grade or year level.');
});

module.exports = mongoose.model("User", userSchema);
