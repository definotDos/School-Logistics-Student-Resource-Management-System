const mongoose = require("mongoose");

const allocationSchema = new mongoose.Schema(
	{
		// References
		request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true, unique: true },
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
		
		// Allocation Details
		quantity: { type: Number, min: 1, required: true },
		status: { type: String, enum: ["Reserved", "Scheduled", "Verified", "Released"], default: "Reserved" },
		
		// Staff Assignment
		allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin or Staff who approved
		
		// Tracking
		allocationDate: { type: Date, default: Date.now },
		scheduledDate: { type: Date },
		verifiedDate: { type: Date },
		releasedDate: { type: Date },
		
		// Campus Info
		campus: { type: String, trim: true, default: "" },
		
		// Additional Notes
		notes: { type: String, trim: true, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Allocation", allocationSchema);
