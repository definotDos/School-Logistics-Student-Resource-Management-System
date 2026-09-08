const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const {
	getInventoryReport,
	getRequestReport,
	getApprovalAnalytics,
	getDistributionReport,
	getResourceDemandReport,
	getAuditLogReport,
	getDashboardOverview,
} = require("../controllers/reportsController");

const router = express.Router();

// Protect all routes
router.use(protect);
for (const param of ["id", "resourceId", "allocationId"]) router.param(param, (req, res, next, value) => {
	if (!/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ message: "Invalid record ID." });
	next();
});

// Restrict reports to admin/staff only
router.use(allowRoles("admin", "staff"));

// ============================================
// DASHBOARD & OVERVIEW
// ============================================

// Step 9: Get comprehensive dashboard overview
router.get("/overview", getDashboardOverview);

// ============================================
// INVENTORY REPORTS
// ============================================

// Get detailed inventory report
router.get("/inventory/detail", getInventoryReport);

// ============================================
// REQUEST REPORTS
// ============================================

// Get request workflow report
router.get("/requests/workflow", getRequestReport);

// Get approval analytics
router.get("/requests/approval-analytics", getApprovalAnalytics);

// ============================================
// DISTRIBUTION REPORTS
// ============================================

// Get distribution report
router.get("/distribution/detail", getDistributionReport);

// ============================================
// RESOURCE DEMAND REPORTS
// ============================================

// Get resource demand analysis
router.get("/resources/demand", getResourceDemandReport);

// ============================================
// AUDIT REPORTS
// ============================================

// Get audit log report
router.get("/audit-log", getAuditLogReport);

// ============================================
// COMPREHENSIVE EXPORT
// ============================================

// Get all reports combined
router.get("/", getDashboardOverview);

module.exports = router;
