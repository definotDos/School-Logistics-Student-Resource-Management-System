const Request = require("../models/Request");
const Allocation = require("../models/Allocation");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");

const formatRequest = (request) => ({
	id: `REQ-${request._id.toString().slice(-8).toUpperCase()}`,
	databaseId: request._id.toString(),
	resource: request.resource,
	quantity: request.quantity,
	category: request.category,
	date: request.createdAt,
	status: request.status,
	student: request.student ? { name: request.student.name, email: request.student.email } : undefined,
});

async function createRequest(req, res) {
	try {
		const { resource, category, quantity = 1 } = req.body;
		if (!resource?.trim()) return res.status(400).json({ message: "Choose a resource before submitting." });
		if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) return res.status(400).json({ message: "Quantity must be a positive whole number." });
		const duplicate = await Request.findOne({ student: req.user._id, resource: resource.trim(), status: { $in: ["pending", "approved"] } });
		if (duplicate) return res.status(409).json({ message: "You already have an active request for this resource." });
		const request = await Request.create({ student: req.user._id, resource: resource.trim(), quantity: Number(quantity), category: category?.trim() || "Other" });
		res.status(201).json({ request: formatRequest(request) });
	} catch {
		res.status(500).json({ message: "Unable to submit request." });
	}
}

async function getMyRequests(req, res) {
	try {
		const requests = await Request.find({ student: req.user._id }).sort({ createdAt: -1 });
		res.json({ requests: requests.map(formatRequest) });
	} catch {
		res.status(500).json({ message: "Unable to load your requests." });
	}
}

async function getAllRequests(req, res) {
	try {
		const requests = await Request.find().populate("student", "name email").sort({ createdAt: -1 });
		res.json({ requests: requests.map(formatRequest) });
	} catch {
		res.status(500).json({ message: "Unable to load requests." });
	}
}

async function updateRequestStatus(req, res) {
	try {
		if (!["approved", "rejected", "released"].includes(req.body.status)) return res.status(400).json({ message: "Invalid request status." });
		const current = await Request.findById(req.params.id);
		if (!current) return res.status(404).json({ message: "Request was not found." });
		if (current.status !== "pending") return res.status(409).json({ message: "Only pending requests can be decided." });
		if (req.body.status === "approved") {
			const Resource = require("../models/Resource");
			const Inventory = require("../models/Inventory");
			const resource = await Resource.findOne({ name: current.resource });
			if (!resource) return res.status(409).json({ message: "This resource is no longer in the catalog." });
			const stock = await Inventory.findOneAndUpdate({ resource: resource._id, available: { $gte: current.quantity } }, { $inc: { available: -current.quantity, reserved: current.quantity } }, { new: true });
			if (!stock) return res.status(409).json({ message: "Insufficient available stock for this request." });
			current.resourceRef = resource._id;
			await Resource.findByIdAndUpdate(resource._id, { status: "Reserved" });
		}
		current.status = req.body.status;
		current.reason = req.body.reason?.trim() || "";
		const request = await current.save();
		if (req.body.status === "approved") {
			await Allocation.create({ request: request._id, student: request.student, resource: request.resourceRef, quantity: request.quantity });
		}
		await Notification.create({ user: request.student, title: `Request ${req.body.status}`, message: req.body.reason?.trim() || `Your request for ${request.resource} was ${req.body.status}.` });
		await AuditLog.create({ actor: req.user._id, action: `request.${req.body.status}`, entity: "Request", entityId: request._id, details: request.reason });
		await request.populate("student", "name email");
		res.json({ request: formatRequest(request) });
	} catch {
		res.status(500).json({ message: "Unable to update request." });
	}
}

module.exports = { createRequest, getMyRequests, getAllRequests, updateRequestStatus };
