const express = require("express");
const protect = require("../middleware/authMiddleware");
const Inventory = require("../models/Inventory");

const router = express.Router();
router.use(protect);
router.get("/", async (req, res) => {
	try {
		const inventory = await Inventory.find().populate("resource", "name category campus status").sort({ updatedAt: -1 });
		res.json({ inventory });
	} catch {
		res.status(500).json({ message: "Unable to load inventory." });
	}
});

module.exports = router;
