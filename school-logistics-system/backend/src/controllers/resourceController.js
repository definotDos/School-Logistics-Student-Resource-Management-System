const Resource = require("../models/Resource");
const Inventory = require("../models/Inventory");

async function listResources(req, res) {
	try {
		const resources = await Resource.find().sort({ name: 1 }).lean();
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
		const stock = await Inventory.findOneAndUpdate({ resource: req.params.resourceId }, { $inc: { available: quantity }, $set: { lastReceivedBy: req.user._id } }, { new: true });
		if (!stock) return res.status(404).json({ message: "Resource inventory was not found." });
		await Resource.findByIdAndUpdate(req.params.resourceId, { status: "Available" });
		res.json({ stock });
	} catch {
		res.status(500).json({ message: "Unable to receive stock." });
	}
}

module.exports = { listResources, createResource, receiveStock };
