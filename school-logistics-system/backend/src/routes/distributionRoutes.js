const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { createSchedule, getMySchedules, releaseAllocation } = require("../controllers/distributionController");

const router = express.Router();
router.use(protect);
router.get("/schedules/my", allowRoles("student"), getMySchedules);
router.post("/schedules", allowRoles("admin", "staff"), createSchedule);
router.post("/allocations/:allocationId/release", allowRoles("admin", "staff"), releaseAllocation);

module.exports = router;
