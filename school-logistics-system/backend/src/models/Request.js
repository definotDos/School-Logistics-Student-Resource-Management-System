const mongoose = require("mongoose");
const { REQUEST_STATUSES, normalizeStatus } = require("../utils/status");

const requestSchema = new mongoose.Schema(
	{
		// Student & Resource Info
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		resourceRef: { type: mongoose.Schema.Types.ObjectId, ref: "Resource" },
		resource: { type: String, required: true, trim: true },
		resourceImage: { type: String, default: "" },
		quantity: { type: Number, min: 1, default: 1 },
		uniformStyle: { type: String, enum: ["", "Trojan T-shirt", "CITE Polo"], default: "" },
		uniformSize: { type: String, enum: ["", "XS", "S", "M", "L", "XL", "2XL", "3XL"], default: "" },
		category: { type: String, trim: true, default: "Other" },
		campus: { type: String, trim: true, default: "" },
		
		// Workflow Status
		status: { 
			type: String, 
			enum: REQUEST_STATUSES,
			set: normalizeStatus,
			default: "pending" 
		},
		
		// Eligibility & Approval Info
		eligibilityChecked: { type: Boolean, default: false },
		eligibilityStatus: { type: String, enum: ["eligible", "ineligible", "pending"], default: "pending" },
		checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Staff member
		checkedAt: { type: Date },
		
		// Approval Info
		approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin or Staff
		approvedAt: { type: Date },
		rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		rejectedAt: { type: Date },
		cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		cancelledAt: { type: Date },
		rejectionReason: { type: String, trim: true, default: "" },
		reason: { type: String, trim: true, default: "" },
		
		// Claim & Distribution Info
		claimedAt: { type: Date },
		claimedBy: { type: String, default: "" }, // Student name at claim time
		releasedAt: { type: Date },
		releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Logistics staff
		
		// General Notes
		notes: { type: String, trim: true, default: "" },
		priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
	},
	{ timestamps: true, optimisticConcurrency: true }
);

requestSchema.index({ student: 1, resourceRef: 1, uniformStyle: 1 }, require("../utils/requestIndexes").activeRequestIndex);

module.exports = mongoose.model("Request", requestSchema);
