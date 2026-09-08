const mongoose = require("mongoose");

const campusSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, unique: true },
	code: { type: String, trim: true, default: "" },
	address: { type: String, trim: true, default: "" },
	contact: { type: String, trim: true, default: "" },
	status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

module.exports = mongoose.model("Campus", campusSchema);
