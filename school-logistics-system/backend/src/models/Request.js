const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
	{
		// Student & Resource Info
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		resourceRef: { type: mongoose.Schema.Types.ObjectId, ref: "Resource" },
		resource: { type: String, required: true, trim: true },
		quantity: { type: Number, min: 1, default: 1 },
		category: { type: String, trim: true, default: "Other" },
		campus: { type: String, trim: true, default: "" },
		
		// Workflow Status
		status: { 
			type: String, 
			enum: ["pending", "approved", "rejected", "ready_for_claim", "claimed", "released", "completed"], 
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
	{ timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
