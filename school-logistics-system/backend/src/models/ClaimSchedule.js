const mongoose = require("mongoose");

const claimScheduleSchema = new mongoose.Schema(
	{
		allocation: { type: mongoose.Schema.Types.ObjectId, ref: "Allocation", required: true, unique: true },
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		pickupDate: { type: Date, required: true },
		startTime: { type: String, required: true },
		endTime: { type: String, required: true },
		location: { type: String, required: true, trim: true },
		status: { type: String, enum: ["Scheduled", "Completed"], default: "Scheduled" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("ClaimSchedule", claimScheduleSchema);
