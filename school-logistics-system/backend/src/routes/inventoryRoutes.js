const { campusFilter, canAccessCampus } = require("../middleware/campusScope");
const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const Inventory = require("../models/Inventory");
const Resource = require("../models/Resource");

const router = express.Router();
router.use(protect);
for (const param of ["id", "resourceId", "allocationId"]) router.param(param, (req, res, next, value) => {
	if (!/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ message: "Invalid record ID." });
	next();
});

// ============================================
// GET INVENTORY
// ============================================

// Get all inventory
router.get("/", allowRoles("admin", "staff"), async (req, res) => {
	try {
		const { campus } = campusFilter(req);
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

		if (!canAccessCampus(req, inventory.resource)) return res.status(403).json({ message: "Resource belongs to another campus." });
		res.json({ inventory });
	} catch (error) {
		res.status(500).json({ message: "Unable to load inventory.", error: error.message });
	}
});

// ============================================
// ADMIN ONLY: MANAGE INVENTORY
// ============================================

// Create inventory without resetting an existing stock ledger
router.post("/:resourceId/create", allowRoles("admin"), async (req, res) => {
	try {
		const { available, reserved, issued } = req.body;
		if ([available, reserved, issued].some(value => value !== undefined && (!Number.isInteger(value) || value < 0))) return res.status(400).json({ message: "Stock quantities must be non-negative whole numbers." });
		if (reserved !== undefined || issued !== undefined) return res.status(400).json({ message: "Reserved and issued stock are managed by the request workflow." });

		const resource = await Resource.findById(req.params.resourceId);
		if (!resource) {
			return res.status(404).json({ message: "Resource not found." });
		}

		const scopedResource = await Resource.findById(req.params.resourceId);
		if (!scopedResource) return res.status(404).json({ message: "Resource not found." });
		if (!canAccessCampus(req, scopedResource)) return res.status(403).json({ message: "Resource belongs to another campus." });
		if (await Inventory.exists({ resource: req.params.resourceId })) return res.status(409).json({ message: "Inventory already exists. Receive stock or update available quantity." });
		const inventory = await Inventory.findOneAndUpdate(
			{ resource: req.params.resourceId },
			{ $setOnInsert: { resource: req.params.resourceId, available: available ?? 0 } },
			{ upsert: true, returnDocument: "after", runValidators: true }
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
		if ([available, reserved, issued].some(value => value !== undefined && (!Number.isInteger(value) || value < 0))) return res.status(400).json({ message: "Stock quantities must be non-negative whole numbers." });
		if (reserved !== undefined || issued !== undefined) return res.status(400).json({ message: "Reserved and issued stock are managed by the request workflow." });

		const scopedResource = await Resource.findById(req.params.resourceId);
		if (!scopedResource) return res.status(404).json({ message: "Resource not found." });
		if (!canAccessCampus(req, scopedResource)) return res.status(403).json({ message: "Resource belongs to another campus." });
		const inventory = await Inventory.findOneAndUpdate(
			{ resource: req.params.resourceId },
			{
				...(available !== undefined && { available }),
				...(reserved !== undefined && { reserved }),
				...(issued !== undefined && { issued }),
			},
			{ returnDocument: "after", runValidators: true }
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

