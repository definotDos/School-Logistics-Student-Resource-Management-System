const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const {
	createRequest,
	verifyEligibility,
	approveRequest,
	rejectRequest,
	getMyRequests,
	getAllRequests,
	getRequestById,
	getRequestsByStatus,
} = require("../controllers/requestController");

const router = express.Router();

// Protect all routes
router.use(protect);

// ============================================
// STUDENT ROUTES
// ============================================

// Step 1: Student creates request
router.post("/", allowRoles("student"), createRequest);

// Student views their requests; staff/admin may access the endpoint but should not see any student data
router.get("/my", allowRoles("student", "staff", "admin"), getMyRequests);

// ============================================
// STAFF/ADMIN ROUTES
// ============================================

// Step 2: Staff verifies eligibility
router.post("/:id/verify-eligibility", allowRoles("staff", "admin"), verifyEligibility);

// Step 3: Approve request
router.post("/:id/approve", allowRoles("admin", "staff"), approveRequest);

// Step 3: Reject request
router.post("/:id/reject", allowRoles("admin", "staff"), rejectRequest);

// Staff/Admin views all requests
router.get("/all", allowRoles("admin", "staff"), getAllRequests);

// Get requests by status (for monitoring)
router.get("/status/:status", allowRoles("admin", "staff"), getRequestsByStatus);

// ============================================
// SHARED ROUTES
// ============================================

// Get single request
router.get("/:id", getRequestById);

module.exports = router;
