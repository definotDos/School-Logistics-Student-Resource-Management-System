const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
	{
		actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		action: { type: String, required: true },
		entity: { type: String, required: true },
		entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
		details: { type: String, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);