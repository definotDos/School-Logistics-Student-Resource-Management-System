const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
	{
		// Who performed the action
		actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		actorRole: { type: String, enum: ["student", "admin", "staff"], default: "student" },
		
		// What action was performed
		action: { type: String, required: true }, // e.g., "request_created", "request_approved", "schedule_assigned", "claim_verified", "resource_released"
		
		// What entity was affected
		entity: { type: String, required: true }, // "Request", "Allocation", "ClaimSchedule", "Distribution", "Inventory"
		entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
		
		// Status change tracking
		previousStatus: { type: String, default: "" },
		newStatus: { type: String, default: "" },
		
		// Details and context
		details: { type: String, default: "" },
		metadata: { type: Object, default: {} }, // Additional JSON data for tracking
		
		// Related entities
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource" },
		
		// Timestamp is automatic
	},
	{ timestamps: true }
);

// Index for faster queries
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);