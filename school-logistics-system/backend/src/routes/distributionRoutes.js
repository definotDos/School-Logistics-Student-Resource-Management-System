const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const {
	verifyClaimIdentity,
	releaseAllocation,
	getMySchedules,
	getAllSchedules,
	getDistributions,
	getDistributionById,
	getDistributionsByStatus,
	getDistributionProgress,
} = require("../controllers/distributionController");

const router = express.Router();

// Protect all routes
router.use(protect);

// ============================================
// CLAIM SCHEDULE ROUTES
// ============================================

// Step 6: Student views their schedules
router.get("/schedules/my", allowRoles("student"), getMySchedules);

// View all schedules (admin/staff)
router.get("/schedules", allowRoles("admin", "staff"), getAllSchedules);

// ============================================
// CLAIM VERIFICATION ROUTES
// ============================================

// Step 7: Staff verifies student identity/claim
router.post("/schedules/:id/verify", allowRoles("staff", "admin"), verifyClaimIdentity);

// ============================================
// RESOURCE RELEASE ROUTES
// ============================================

// Step 8: Staff releases resource / marks as distributed
router.post("/allocations/:allocationId/release", allowRoles("staff", "admin"), releaseAllocation);

// ============================================
// DISTRIBUTION TRACKING ROUTES
// ============================================

// View all distributions
router.get("/", allowRoles("admin", "staff", "student"), getDistributions);

// View distributions by status
router.get("/status/:status", allowRoles("admin", "staff"), getDistributionsByStatus);

// Step 9: View distribution progress and monitoring
router.get("/progress", allowRoles("admin", "staff"), getDistributionProgress);

// Get single distribution
router.get("/:id", getDistributionById);

module.exports = router;
