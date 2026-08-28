const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
	{
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		resourceRef: { type: mongoose.Schema.Types.ObjectId, ref: "Resource" },
		resource: { type: String, required: true, trim: true },
		quantity: { type: Number, min: 1, default: 1 },
		category: { type: String, trim: true, default: "Other" },
		status: { type: String, enum: ["pending", "approved", "rejected", "released"], default: "pending" },
		reason: { type: String, trim: true, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
