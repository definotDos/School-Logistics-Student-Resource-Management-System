const { campusFilter, canAccessCampus } = require("../middleware/campusScope");
const Resource = require("../models/Resource");
const Inventory = require("../models/Inventory");

async function listResources(req, res) {
	try {
		const resources = await Resource.find(campusFilter(req)).sort({ name: 1 }).lean();
		const inventory = await Inventory.find({ resource: { $in: resources.map((item) => item._id) } }).lean();
		const stockByResource = new Map(inventory.map((item) => [item.resource.toString(), item]));
		res.json({ resources: resources.map((resource) => ({ ...resource, stock: stockByResource.get(resource._id.toString()) || { available: 0, reserved: 0, issued: 0 } })) });
	} catch {
		res.status(500).json({ message: "Unable to load resources." });
	}
}

async function createResource(req, res) {
	try {
		const { name, category, description, campus, sizingRule, quantity = 0 } = req.body;
		if (!name?.trim() || !category?.trim() || !campus?.trim()) return res.status(400).json({ message: "Name, category, and campus are required." });
		if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) return res.status(400).json({ message: "Quantity must be a non-negative whole number." });
		if (!canAccessCampus(req, { campus }) || !await require("../models/Campus").exists({ name: campus, status: "active" })) return res.status(400).json({ message: "Choose an active campus in your workspace." });
		const resource = await Resource.create({ name: name.trim(), category: category.trim(), description, campus: campus.trim(), sizingRule, status: Number(quantity) ? "Available" : "Issued" });
		const stock = await Inventory.create({ resource: resource._id, available: Number(quantity), lastReceivedBy: req.user._id });
		res.status(201).json({ resource: { ...resource.toObject(), stock } });
	} catch (error) {
		if (error.code === 11000) return res.status(409).json({ message: "This resource already exists." });
		res.status(500).json({ message: "Unable to add resource." });
	}
}

async function receiveStock(req, res) {
	try {
		const quantity = Number(req.body.quantity);
		if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ message: "Receive quantity must be a positive whole number." });
		const resource = await Resource.findById(req.params.resourceId);
		if (!resource) return res.status(404).json({ message: "Resource not found." });
		if (!canAccessCampus(req, resource)) return res.status(403).json({ message: "Resource belongs to another campus." });
		const stock = await Inventory.findOneAndUpdate({ resource: req.params.resourceId }, { $inc: { available: quantity }, $set: { lastReceivedBy: req.user._id } }, { returnDocument: "after" });
		if (!stock) return res.status(404).json({ message: "Resource inventory was not found." });
		await Resource.findByIdAndUpdate(req.params.resourceId, { status: "Available" });
		res.json({ stock });
	} catch {
		res.status(500).json({ message: "Unable to receive stock." });
	}
}

async function updateResource(req, res) {
	try {
		const allowed = ["name", "category", "description", "campus", "sizingRule", "maxQuantityPerStudent", "status"];
		const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
		if (!Object.keys(updates).length) return res.status(400).json({ message: "At least one resource field is required." });
		if (updates.name !== undefined && !String(updates.name).trim()) return res.status(400).json({ message: "Resource name cannot be empty." });
		const existing = await Resource.findById(req.params.resourceId);
		if (!existing) return res.status(404).json({ message: "Resource not found." });
		if (!canAccessCampus(req, existing)) return res.status(403).json({ message: "Resource belongs to another campus." });
		if (updates.campus !== undefined && updates.campus !== existing.campus) return res.status(409).json({ message: "A resource with a stock ledger cannot be moved between campuses." });
		const resource = await Resource.findByIdAndUpdate(req.params.resourceId, updates, { returnDocument: "after", runValidators: true });
		if (!resource) return res.status(404).json({ message: "Resource not found." });
		res.json({ resource });
	} catch (error) {
		res.status(400).json({ message: error.message || "Unable to update resource." });
	}
}

module.exports = { listResources, createResource, receiveStock, updateResource };
