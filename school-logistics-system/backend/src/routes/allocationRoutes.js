const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { listAllocations } = require("../controllers/allocationController");

const router = express.Router();
router.use(protect);
router.get("/my", allowRoles("student"), listAllocations);
router.get("/", allowRoles("admin", "staff"), listAllocations);

module.exports = router;