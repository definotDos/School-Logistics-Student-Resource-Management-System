const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, unique: true },
		category: { type: String, required: true, trim: true },
		description: { type: String, trim: true, default: "" },
		campus: { type: String, required: true, trim: true },
		sizingRule: { type: String, trim: true, default: "" },
		status: { type: String, enum: ["Available", "Reserved", "Issued"], default: "Available" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);
