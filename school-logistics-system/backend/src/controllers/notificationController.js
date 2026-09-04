const Notification = require("../models/Notification");
const User = require("../models/User");

async function getNotifications(req, res) {
  try {
    const filter = {};
    if (req.user.role === "student") filter.user = req.user._id;
    if (req.user.role === "staff") filter.user = req.user._id;
    if (req.user.role === "admin") filter.user = req.user._id;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ message: "Unable to load notifications.", error: error.message });
  }
}

async function createNotification(req, res) {
  try {
    if (!["staff", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only staff or admin users can create notifications." });
    }
    const { user, title, message, type = "general", relatedEntityId, actionUrl = "" } = req.body;

    if (!user || !title || !message) {
      return res.status(400).json({ message: "User, title, and message are required." });
    }
    const recipient = await User.findById(user).select("_id role");
    if (!recipient) return res.status(404).json({ message: "Notification recipient was not found." });

    const notification = await Notification.create({
      user,
      userRole: recipient.role,
      type,
      title,
      message,
      relatedEntityId,
      actionUrl,
      sent: true,
      sentAt: new Date(),
      sentBy: req.user?._id || null,
    });

    res.status(201).json({ message: "Notification saved to database.", notification });
  } catch (error) {
    res.status(500).json({ message: "Unable to create notification.", error: error.message });
  }
}

module.exports = { getNotifications, createNotification };
