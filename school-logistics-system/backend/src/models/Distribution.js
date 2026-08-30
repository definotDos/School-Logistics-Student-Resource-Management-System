const mongoose = require("mongoose");

const distributionSchema = new mongoose.Schema(
	{
		// References
		allocation: { type: mongoose.Schema.Types.ObjectId, ref: "Allocation", required: true },
		request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true },
		claimSchedule: { type: mongoose.Schema.Types.ObjectId, ref: "ClaimSchedule" },
		
		// Student & Resource Info
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
		quantity: { type: Number, min: 1, required: true },
		
		// Distribution Status
		status: { type: String, enum: ["Pending", "Prepared", "Released", "Received", "Completed"], default: "Pending" },
		
		// Release Details
		releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Logistics staff
		releasedAt: { type: Date, required: true },
		
		// Claim Details
		claimedBy: { type: String, default: "" }, // Student name at claim time
		claimedAt: { type: Date },
		
		// Verification
		verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		verifiedAt: { type: Date },
		verificationNotes: { type: String, trim: true, default: "" },
		
		// Quantity delivered vs claimed
		quantityRequested: { type: Number, default: 0 },
		quantityDelivered: { type: Number, default: 0 },
		
		// Campus & Location
		campus: { type: String, trim: true, default: "" },
		distributionLocation: { type: String, trim: true, default: "" },
		
		// Additional tracking
		notes: { type: String, trim: true, default: "" },
		referenceId: { type: String, unique: true, sparse: true }, // Unique reference for tracking
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Distribution", distributionSchema);
