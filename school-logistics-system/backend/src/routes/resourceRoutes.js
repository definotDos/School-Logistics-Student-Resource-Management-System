const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { listResources, createResource, receiveStock, updateResource } = require("../controllers/resourceController");

const router = express.Router();
router.use(protect);
router.get("/", listResources);
router.post("/", allowRoles("admin", "staff"), createResource);
router.patch("/:resourceId", allowRoles("admin", "staff"), updateResource);
router.patch("/:resourceId/receive", allowRoles("admin", "staff"), receiveStock);

module.exports = router;
