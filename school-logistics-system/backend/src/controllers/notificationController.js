const Notification = require("../models/Notification");
const User = require("../models/User");
const { campusFilter, canAccessCampus } = require("../middleware/campusScope");

async function getNotifications(req, res) {
  try {
    let filter = { user: req.user._id };
    if (req.query.manage === "true" && req.user.role !== "student") {
      const recipients = await User.find(campusFilter(req)).select("_id");
      filter = req.user.role === "admin" ? { user: { $in: recipients.map(u => u._id) } } : { $or: [{ user: req.user._id }, { sentBy: req.user._id }] };
    }

    const notifications = await Notification.find(filter)
      .populate("user", "name role")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ count: notifications.length, notifications });
  } catch (error) {
    res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load notifications.", error: error.message });
  }
}

async function createNotification(req, res) {
  try {
    if (!["staff", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only staff or admin users can create notifications." });
    }
    const { user, title, message, type = "general", relatedEntityId, actionUrl = "" } = req.body;

    if (!user || typeof title !== "string" || !title.trim() || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "User, title, and message are required." });
    }
    const recipient = await User.findById(user).select("_id role campus status");
    if (!recipient) return res.status(404).json({ message: "Notification recipient was not found." });
    if (!canAccessCampus(req, recipient)) return res.status(403).json({ message: "Recipient belongs to another campus." });
    if (recipient.status !== "active") return res.status(409).json({ message: "Recipient is suspended." });
    if (!Notification.schema.path("type").enumValues.includes(type)) return res.status(400).json({ message: "Invalid notification type." });

    const notification = await Notification.create({
      user,
      userRole: recipient.role,
      type,
      title: title.trim(),
      message: message.trim(),
      relatedEntityId,
      actionUrl,
      sent: true,
      sentAt: new Date(),
      sentBy: req.user?._id || null,
    });

    res.status(201).json({ message: "Notification saved to database.", notification });
  } catch (error) {
    res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to create notification.", error: error.message });
  }
}

async function markRead(req, res) {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true, readAt: new Date() }, { returnDocument: "after" });
  if (!notification) return res.status(404).json({ message: "Notification not found." });
  res.json({ notification });
}
module.exports = { getNotifications, createNotification, markRead };
