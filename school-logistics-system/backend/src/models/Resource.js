const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
	{
		// Basic Info
		name: { type: String, required: true, trim: true, unique: true },
		category: { type: String, required: true, trim: true },
		description: { type: String, trim: true, default: "" },
		
		// Location & Campus
		campus: { type: String, required: true, trim: true },
		storageLocation: { type: String, trim: true, default: "" },
		
		// Availability & Status
		status: { type: String, enum: ["Available", "Reserved", "Issued", "Discontinued"], default: "Available" },
		
		// Sizing & Constraints
		sizingRule: { type: String, trim: true, default: "" },
		maxQuantityPerStudent: { type: Number, min: 1, default: 5 },
		eligibilityGrades: [String], // e.g., ["Grade 11", "Grade 12"]
		
		// Quantity Tracking (if you want direct quantity in Resource)
		totalQuantity: { type: Number, min: 0, default: 0 },
		
		// Administrative
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		
		// Notes
		notes: { type: String, trim: true, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);
