const Campus = require("../models/Campus");
const { transactional } = require("../services/transaction");
const { createAuditLog } = require("../services/workflowRecords");
const fields = body => Object.fromEntries(Object.entries(body).filter(([key]) => ["name", "code", "address", "contact", "status"].includes(key)));

async function listPublic(req, res) {
  res.json({ campuses: await Campus.find({ status: "active" }).select("name code").sort({ name: 1 }) });
}
async function listCampuses(req, res) {
  res.json({ campuses: await Campus.find(req.user.role === "admin" ? {} : { name: req.user.campus }).sort({ name: 1 }) });
}
async function createCampus(req, res) {
  const campus = await Campus.create(fields(req.body));
  await createAuditLog(req.user, "campus_created", "Campus", campus._id, null, campus.status, "Campus created", { campus: campus.name });
  res.status(201).json({ campus });
}
async function updateCampus(req, res) {
  const campus = await Campus.findById(req.params.id);
  if (!campus) return res.status(404).json({ message: "Campus not found." });
  if (req.body.name !== undefined && typeof req.body.name !== "string") return res.status(400).json({ message: "Campus name must be text." });
  if (req.body.name !== undefined && req.body.name.trim() !== campus.name) return res.status(409).json({ message: "Campus names cannot change because existing records reference them. Edit contact details or deactivate the campus instead." });
  const previousStatus = campus.status;
  Object.assign(campus, fields(req.body));
  await campus.save();
  await createAuditLog(req.user, "campus_updated", "Campus", campus._id, previousStatus, campus.status, "Campus updated", { campus: campus.name });
  res.json({ campus });
}
async function deleteCampus(req, res) {
  const campus = await Campus.findById(req.params.id);
  if (!campus) return res.status(404).json({ message: "Campus not found." });
  for (const name of ["User", "Resource", "Request", "Allocation", "ClaimSchedule", "Distribution", "AuditLog", "Notification"]) {
    const filter = name === "User" ? { $or: [{ campus: campus.name }, { activeCampus: campus.name }] } : { campus: campus.name };
    if (await require(`../models/${name}`).exists(filter)) return res.status(409).json({ message: "This campus has linked records. Deactivate it instead." });
  }
  await createAuditLog(req.user, "campus_deleted", "Campus", campus._id, campus.status, null, "Campus deleted", { campus: campus.name });
  await campus.deleteOne();
  res.json({ message: "Campus deleted." });
}
module.exports = { listPublic, listCampuses, createCampus: transactional(createCampus), updateCampus: transactional(updateCampus), deleteCampus: transactional(deleteCampus) };
