const mongoose = require("mongoose");

const distributionSchema = new mongoose.Schema(
	{
		allocation: { type: mongoose.Schema.Types.ObjectId, ref: "Allocation", required: true },
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		quantity: { type: Number, min: 1, required: true },
		releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		releasedAt: { type: Date, required: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Distribution", distributionSchema);
