const mongoose = require("mongoose");

const claimScheduleSchema = new mongoose.Schema(
	{
		// References
		allocation: { type: mongoose.Schema.Types.ObjectId, ref: "Allocation", required: true, unique: true },
		request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true },
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
		
		// Schedule Details
		pickupDate: { type: Date, required: true },
		startTime: { type: String, required: true }, // HH:MM format
		endTime: { type: String, required: true },   // HH:MM format
		location: { type: String, required: true, trim: true },
		campus: { type: String, trim: true, default: "" },
		
		// Schedule Status
		status: { type: String, enum: ["Scheduled", "Confirmed", "Completed", "NoShow", "Cancelled"], default: "Scheduled" },
		
		// Verification & Completion
		verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Staff member
		verifiedAt: { type: Date },
		verificationDetails: { type: String, trim: true, default: "" }, // Notes on verification
		
		// Cancellation Info
		cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		cancelledAt: { type: Date },
		cancellationReason: { type: String, trim: true, default: "" },
		
		// Quantity at claim
		quantityClaimed: { type: Number, min: 0 },
		
		// Additional Notes
		notes: { type: String, trim: true, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("ClaimSchedule", claimScheduleSchema);
