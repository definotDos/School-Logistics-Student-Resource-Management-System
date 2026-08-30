const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const {
	processAllocation,
	createClaimSchedule,
	listAllocations,
	getAllocationById,
	getStudentAllocations,
	getAllocationsByStatus,
} = require("../controllers/allocationController");

const router = express.Router();

// Protect all routes
router.use(protect);

// ============================================
// ADMIN/STAFF ROUTES
// ============================================

// Step 4: Admin processes allocation (reserves resource)
router.post("/:id/process", allowRoles("admin", "staff"), processAllocation);

// Step 5: Logistics staff creates claim schedule
router.post("/:id/schedule", allowRoles("staff", "admin"), createClaimSchedule);

// View all allocations (admin/staff)
router.get("/all", allowRoles("admin", "staff"), listAllocations);

// Get allocations by status
router.get("/status/:status", allowRoles("admin", "staff"), getAllocationsByStatus);

// ============================================
// STUDENT ROUTES
// ============================================

// Student views their allocations
router.get("/my", allowRoles("student"), getStudentAllocations);

// ============================================
// SHARED ROUTES
// ============================================

// Get single allocation
router.get("/:id", getAllocationById);

module.exports = router;