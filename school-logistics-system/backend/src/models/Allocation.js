const mongoose = require("mongoose");

const allocationSchema = new mongoose.Schema(
	{
		request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true, unique: true },
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
		quantity: { type: Number, min: 1, required: true },
		status: { type: String, enum: ["Reserved", "Released"], default: "Reserved" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Allocation", allocationSchema);
