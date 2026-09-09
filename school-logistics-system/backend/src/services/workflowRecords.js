const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const User = require("../models/User");

async function createAuditLog(actor, action, entity, entityId, previousStatus, newStatus, details = "", metadata = {}) {
  const target = mongoose.models[entity] ? await mongoose.model(entity).findById(entityId).lean() : null;
  let campus = metadata.campus || (entity === "Campus" ? target?.name : target?.campus);
  if (!campus && target?.resource && entity === "Inventory") {
    campus = (await mongoose.model("Resource").findById(target.resource).lean())?.campus;
  }
  return AuditLog.create({ actor: actor._id, actorRole: actor.role, action, entity, entityId,
    previousStatus, newStatus, details, metadata, campus: campus || actor.activeCampus || actor.campus });
}

async function sendNotification(userId, type, title, message, relatedEntityId = null, actionUrl = "") {
  const recipient = await User.findById(userId).select("role campus");
  if (!recipient) throw new Error("Notification recipient no longer exists.");
  return Notification.create({ user: recipient._id, userRole: recipient.role, campus: recipient.campus,
    type, title, message, relatedEntityId, actionUrl, sent: true, sentAt: new Date() });
}

module.exports = { createAuditLog, sendNotification };
