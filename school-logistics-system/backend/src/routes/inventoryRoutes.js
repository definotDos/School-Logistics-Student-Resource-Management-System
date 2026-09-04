const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const Inventory = require("../models/Inventory");
const Resource = require("../models/Resource");

const router = express.Router();
router.use(protect);

// ============================================
// GET INVENTORY
// ============================================

// Get all inventory
router.get("/", allowRoles("admin", "staff"), async (req, res) => {
	try {
		const { campus } = req.query;
		const filter = {};

		const inventory = await Inventory.find(filter)
			.populate({
				path: "resource",
				select: "name category campus status description",
				match: campus ? { campus } : {}
			})
			.sort({ updatedAt: -1 })
			.lean();

		const filtered = inventory.filter(inv => inv.resource !== null);

		res.json({
			count: filtered.length,
			inventory: filtered.map(inv => ({
				id: inv._id,
				resource: inv.resource,
				available: inv.available,
				reserved: inv.reserved,
				issued: inv.issued,
				total: inv.available + inv.reserved + inv.issued,
				lastUpdated: inv.updatedAt,
			})),
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load inventory.", error: error.message });
	}
});

// Get inventory by resource
router.get("/:resourceId", allowRoles("admin", "staff"), async (req, res) => {
	try {
		const inventory = await Inventory.findOne({ resource: req.params.resourceId })
			.populate("resource", "name category campus status");

		if (!inventory) {
			return res.status(404).json({ message: "Inventory record not found." });
		}

		res.json({ inventory });
	} catch (error) {
		res.status(500).json({ message: "Unable to load inventory.", error: error.message });
	}
});

// ============================================
// ADMIN ONLY: MANAGE INVENTORY
// ============================================

// Create/update inventory for a resource
router.post("/:resourceId/create", allowRoles("admin"), async (req, res) => {
	try {
		const { available, reserved, issued } = req.body;

		const resource = await Resource.findById(req.params.resourceId);
		if (!resource) {
			return res.status(404).json({ message: "Resource not found." });
		}

		const inventory = await Inventory.findOneAndUpdate(
			{ resource: req.params.resourceId },
			{
				resource: req.params.resourceId,
				available: available || 0,
				reserved: reserved || 0,
				issued: issued || 0,
			},
			{ upsert: true, new: true }
		).populate("resource", "name category");

		res.status(201).json({ message: "Inventory created/updated", inventory });
	} catch (error) {
		res.status(500).json({ message: "Unable to create inventory.", error: error.message });
	}
});

// Update inventory quantities
router.patch("/:resourceId/update", allowRoles("admin"), async (req, res) => {
	try {
		const { available, reserved, issued } = req.body;

		const inventory = await Inventory.findOneAndUpdate(
			{ resource: req.params.resourceId },
			{
				...(available !== undefined && { available }),
				...(reserved !== undefined && { reserved }),
				...(issued !== undefined && { issued }),
			},
			{ new: true }
		).populate("resource", "name category");

		if (!inventory) {
			return res.status(404).json({ message: "Inventory not found." });
		}

		res.json({ message: "Inventory updated", inventory });
	} catch (error) {
		res.status(500).json({ message: "Unable to update inventory.", error: error.message });
	}
});

module.exports = router;

