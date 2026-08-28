const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
	{
		resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true, unique: true },
		available: { type: Number, min: 0, default: 0 },
		reserved: { type: Number, min: 0, default: 0 },
		issued: { type: Number, min: 0, default: 0 },
		lastReceivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
