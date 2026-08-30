const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
	{
		// Recipient
		user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		userRole: { type: String, enum: ["student", "admin", "staff"], default: "student" },
		
		// Notification Content
		type: { type: String, enum: ["approval", "rejection", "schedule", "reminder", "release", "general"], default: "general" },
		title: { type: String, required: true },
		message: { type: String, required: true },
		
		// Related Entity
		relatedEntity: { type: String, default: "" }, // "Request", "ClaimSchedule", "Distribution"
		relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
		
		// Status
		read: { type: Boolean, default: false },
		readAt: { type: Date },
		
		// Send Status
		sent: { type: Boolean, default: false },
		sentAt: { type: Date },
		sentVia: { type: String, enum: ["app", "email", "sms"], default: "app" },
		
		// Sender (optional, for batch notifications)
		sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		
		// Action URL (if applicable)
		actionUrl: { type: String, default: "" },
		
		// Data for context
		metadata: { type: Object, default: {} },
		
		// Priority
		priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
	},
	{ timestamps: true }
);

// Index for faster queries
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
