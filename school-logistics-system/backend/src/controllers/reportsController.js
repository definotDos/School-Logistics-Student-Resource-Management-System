const Request = require("../models/Request");
const Allocation = require("../models/Allocation");
const Distribution = require("../models/Distribution");
const ClaimSchedule = require("../models/ClaimSchedule");
const Inventory = require("../models/Inventory");
const Resource = require("../models/Resource");
const AuditLog = require("../models/AuditLog");

// ============================================
// STEP 9: REPORTS & MONITORING
// ============================================

// ============================================
// INVENTORY REPORTS
// ============================================

async function getInventoryReport(req, res) {
	try {
		const { campus } = req.query;
		const filter = campus ? { campus } : {};

		const inventory = await Inventory.find()
			.populate({
				path: "resource",
				match: campus ? { campus } : {}
			})
			.lean();

		const filteredInventory = inventory.filter(inv => inv.resource !== null);

		const report = {
			generatedAt: new Date(),
			campus: campus || "All Campuses",
			summary: {
				totalResources: filteredInventory.length,
				totalAvailable: filteredInventory.reduce((sum, inv) => sum + inv.available, 0),
				totalReserved: filteredInventory.reduce((sum, inv) => sum + inv.reserved, 0),
				totalIssued: filteredInventory.reduce((sum, inv) => sum + inv.issued, 0),
			},
			details: filteredInventory.map(inv => ({
				resourceId: inv.resource?._id,
				resourceName: inv.resource?.name,
				category: inv.resource?.category,
				available: inv.available,
				reserved: inv.reserved,
				issued: inv.issued,
				total: inv.available + inv.reserved + inv.issued,
				status: inv.resource?.status,
			})),
		};

		res.json(report);
	} catch (error) {
		res.status(500).json({ message: "Unable to generate inventory report.", error: error.message });
	}
}

// ============================================
// REQUEST REPORTS
// ============================================

async function getRequestReport(req, res) {
	try {
		const { startDate, endDate, campus, status } = req.query;
		const filter = {};

		if (startDate && endDate) {
			filter.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		if (campus) filter.campus = campus;
		if (status) filter.status = status;

		const requests = await Request.find(filter)
			.populate("student", "name email campus")
			.lean();

		const report = {
			generatedAt: new Date(),
			period: {
				startDate: startDate || "All",
				endDate: endDate || "All",
			},
			filters: {
				campus: campus || "All",
				status: status || "All",
			},
			summary: {
				totalRequests: requests.length,
				pending: requests.filter(r => r.status === "pending").length,
				approved: requests.filter(r => r.status === "approved").length,
				rejected: requests.filter(r => r.status === "rejected").length,
				readyForClaim: requests.filter(r => r.status === "ready_for_claim").length,
				claimed: requests.filter(r => r.status === "claimed").length,
				released: requests.filter(r => r.status === "released").length,
				completed: requests.filter(r => r.status === "completed").length,
			},
			approvalRate: requests.length > 0 
				? Math.round((requests.filter(r => r.status === "approved").length / requests.length) * 100) 
				: 0,
			rejectionRate: requests.length > 0
				? Math.round((requests.filter(r => r.status === "rejected").length / requests.length) * 100)
				: 0,
			completionRate: requests.length > 0
				? Math.round((requests.filter(r => r.status === "completed").length / requests.length) * 100)
				: 0,
			details: requests.map(req => ({
				requestId: req._id,
				ref: `REQ-${req._id.toString().slice(-8).toUpperCase()}`,
				resource: req.resource,
				quantity: req.quantity,
				student: req.student?.name,
				email: req.student?.email,
				status: req.status,
				createdAt: req.createdAt,
				approvedAt: req.approvedAt || "N/A",
				completedAt: req.releasedAt || "N/A",
			})),
		};

		res.json(report);
	} catch (error) {
		res.status(500).json({ message: "Unable to generate request report.", error: error.message });
	}
}

// ============================================
// APPROVAL ANALYTICS
// ============================================

async function getApprovalAnalytics(req, res) {
	try {
		const { startDate, endDate, campus } = req.query;
		const filter = {};

		if (startDate && endDate) {
			filter.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		if (campus) filter.campus = campus;

		const requests = await Request.find(filter)
			.populate("approvedBy", "name email")
			.populate("rejectedBy", "name email")
			.lean();

		// Group by staff member
		const approvalsByStaff = {};
		const rejectionsByStaff = {};

		requests.forEach(req => {
			if (req.approvedBy) {
				const staffName = req.approvedBy.name;
				approvalsByStaff[staffName] = (approvalsByStaff[staffName] || 0) + 1;
			}
			if (req.rejectedBy) {
				const staffName = req.rejectedBy.name;
				rejectionsByStaff[staffName] = (rejectionsByStaff[staffName] || 0) + 1;
			}
		});

		const approvedStatuses = ["approved", "ready for claim", "claimed", "completed"];
		const totalApproved = requests.filter(r => approvedStatuses.includes(r.status)).length;

		const report = {
			generatedAt: new Date(),
			period: {
				startDate: startDate || "All",
				endDate: endDate || "All",
			},
			campus: campus || "All",
			summary: {
				totalApproved,
				totalRejected: requests.filter(r => r.status === "rejected").length,
				approvalRate: requests.length > 0
					? Math.round((totalApproved / requests.length) * 100)
					: 0,
			},
			approvalsByStaff: Object.entries(approvalsByStaff).map(([name, count]) => ({ name, count })),
			rejectionsByStaff: Object.entries(rejectionsByStaff).map(([name, count]) => ({ name, count })),
			topRejectionReasons: getTopRejectionReasons(requests),
		};

		res.json(report);
	} catch (error) {
		res.status(500).json({ message: "Unable to generate approval analytics.", error: error.message });
	}
}

function getTopRejectionReasons(requests) {
	const reasons = {};
	requests
		.filter(r => r.status === "rejected" && r.rejectionReason)
		.forEach(r => {
			const reason = r.rejectionReason;
			reasons[reason] = (reasons[reason] || 0) + 1;
		});

	return Object.entries(reasons)
		.map(([reason, count]) => ({ reason, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);
}

// ============================================
// DISTRIBUTION REPORTS
// ============================================

async function getDistributionReport(req, res) {
	try {
		const { startDate, endDate, campus } = req.query;
		const filter = {};

		if (startDate && endDate) {
			filter.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		if (campus) filter.campus = campus;

		const distributions = await Distribution.find(filter)
			.populate("resource", "name category")
			.populate("student", "name email campus")
			.populate("releasedBy", "name")
			.lean();

		const report = {
			generatedAt: new Date(),
			period: {
				startDate: startDate || "All",
				endDate: endDate || "All",
			},
			campus: campus || "All",
			summary: {
				totalDistributed: distributions.length,
				totalQuantity: distributions.reduce((sum, d) => sum + d.quantityDelivered, 0),
				averageTimeToDistribute: calculateAverageTimeToDistribute(distributions),
			},
			byStatus: {
				released: distributions.filter(d => d.status === "Released").length,
				received: distributions.filter(d => d.status === "Received").length,
				completed: distributions.filter(d => d.status === "Completed").length,
			},
			topDistributedResources: getTopDistributedResources(distributions),
			distributionsByStaff: getDistributionsByStaff(distributions),
			details: distributions.map(d => ({
				distributionId: d.referenceId,
				resource: d.resource?.name,
				quantity: d.quantityDelivered,
				student: d.student?.name,
				releasedBy: d.releasedBy?.name,
				status: d.status,
				releasedAt: d.releasedAt,
			})),
		};

		res.json(report);
	} catch (error) {
		res.status(500).json({ message: "Unable to generate distribution report.", error: error.message });
	}
}

function calculateAverageTimeToDistribute(distributions) {
	if (distributions.length === 0) return 0;
	const totalTime = distributions.reduce((sum, d) => {
		const time = new Date(d.releasedAt) - new Date(d.createdAt);
		return sum + time;
	}, 0);
	const avgMs = totalTime / distributions.length;
	const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
	return avgDays;
}

function getTopDistributedResources(distributions) {
	const resources = {};
	distributions.forEach(d => {
		const resourceName = d.resource?.name || "Unknown";
		resources[resourceName] = (resources[resourceName] || 0) + d.quantityDelivered;
	});

	return Object.entries(resources)
		.map(([name, quantity]) => ({ name, quantity }))
		.sort((a, b) => b.quantity - a.quantity)
		.slice(0, 5);
}

function getDistributionsByStaff(distributions) {
	const staff = {};
	distributions.forEach(d => {
		const staffName = d.releasedBy?.name || "Unknown";
		staff[staffName] = (staff[staffName] || 0) + 1;
	});

	return Object.entries(staff).map(([name, count]) => ({ name, count }));
}

// ============================================
// RESOURCE DEMAND REPORT
// ============================================

async function getResourceDemandReport(req, res) {
	try {
		const { campus } = req.query;
		const filter = campus ? { campus } : {};

		const requests = await Request.find(filter)
			.populate("resource", "name category")
			.lean();

		const demandMap = {};

		requests.forEach(req => {
			const resource = req.resource;
			const key = resource || "Unknown";

			if (!demandMap[key]) {
				demandMap[key] = {
					name: key,
					total: 0,
					approved: 0,
					rejected: 0,
					pending: 0,
					completed: 0,
				};
			}

			demandMap[key].total += req.quantity;

			if (req.status === "approved" || req.status === "ready for claim") {
				demandMap[key].approved += req.quantity;
			} else if (req.status === "rejected") {
				demandMap[key].rejected += req.quantity;
			} else if (req.status === "pending") {
				demandMap[key].pending += req.quantity;
			} else if (req.status === "completed" || req.status === "claimed") {
				demandMap[key].completed += req.quantity;
			}
		});

		const report = {
			generatedAt: new Date(),
			campus: campus || "All",
			summary: {
				totalResources: Object.keys(demandMap).length,
				totalDemand: Object.values(demandMap).reduce((sum, r) => sum + r.total, 0),
			},
			topDemandedResources: Object.values(demandMap)
				.sort((a, b) => b.total - a.total)
				.slice(0, 10),
			allResources: Object.values(demandMap).sort((a, b) => b.total - a.total),
		};

		res.json(report);
	} catch (error) {
		res.status(500).json({ message: "Unable to generate resource demand report.", error: error.message });
	}
}

// ============================================
// AUDIT LOG REPORT
// ============================================

async function getAuditLogReport(req, res) {
	try {
		const { startDate, endDate, action, entity, actor } = req.query;
		const filter = {};

		if (startDate && endDate) {
			filter.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		if (action) filter.action = action;
		if (entity) filter.entity = entity;
		if (actor) filter.actor = actor;

		const logs = await AuditLog.find(filter)
			.populate("actor", "name email role")
			.sort({ createdAt: -1 })
			.limit(1000)
			.lean();

		const report = {
			generatedAt: new Date(),
			filters: {
				startDate: startDate || "All",
				endDate: endDate || "All",
				action: action || "All",
				entity: entity || "All",
			},
			summary: {
				totalLogs: logs.length,
				uniqueActors: new Set(logs.map(l => l.actor?._id)).size,
				uniqueActions: new Set(logs.map(l => l.action)).size,
			},
			logs: logs.map(log => ({
				timestamp: log.createdAt,
				actor: log.actor?.name || "Unknown",
				role: log.actor?.role,
				action: log.action,
				entity: log.entity,
				entityId: log.entityId,
				details: log.details,
				statusChange: log.previousStatus ? `${log.previousStatus} → ${log.newStatus}` : "N/A",
			})),
		};

		res.json(report);
	} catch (error) {
		res.status(500).json({ message: "Unable to generate audit log report.", error: error.message });
	}
}

// ============================================
// DASHBOARD OVERVIEW
// ============================================

async function getDashboardOverview(req, res) {
	try {
		const { campus } = req.query;
		const filter = campus ? { campus } : {};
		const User = require("../models/User");

		const [
			totalRequests,
			pending,
			approved,
			rejected,
			completed,
			totalAllocations,
			totalDistributions,
			inventory,
			activeUsers,
		] = await Promise.all([
			Request.countDocuments(filter),
			Request.countDocuments({ ...filter, status: "pending" }),
			Request.countDocuments({ ...filter, status: { $in: ["approved", "ready for claim", "claimed", "completed"] } }),
			Request.countDocuments({ ...filter, status: "rejected" }),
			Request.countDocuments({ ...filter, status: "completed" }),
			Allocation.countDocuments(campus ? { campus } : {}),
			Distribution.countDocuments(campus ? { campus } : {}),
			Inventory.aggregate([
				{
					$group: {
						_id: null,
						totalAvailable: { $sum: "$available" },
						totalReserved: { $sum: "$reserved" },
						totalIssued: { $sum: "$issued" },
					},
				},
			]),
			User.countDocuments(campus ? { campus, status: { $ne: "suspended" } } : { status: { $ne: "suspended" } }),
		]);

		const inventorySummary = inventory[0] || {
			totalAvailable: 0,
			totalReserved: 0,
			totalIssued: 0,
		};

		const overview = {
			generatedAt: new Date(),
			campus: campus || "All Campuses",
			pendingRequests: pending,
			availableResources: inventorySummary.totalAvailable,
			activeUsers,
			scheduledClaims: totalDistributions,
			requests: {
				total: totalRequests,
				pending,
				approved,
				rejected,
				completed,
				completionRate: totalRequests > 0 ? Math.round((completed / totalRequests) * 100) : 0,
				approvalRate: totalRequests > 0 ? Math.round((approved / totalRequests) * 100) : 0,
			},
			allocations: {
				total: totalAllocations,
			},
			distributions: {
				total: totalDistributions,
			},
			inventory: {
				available: inventorySummary.totalAvailable,
				reserved: inventorySummary.totalReserved,
				issued: inventorySummary.totalIssued,
			},
		};

		res.json(overview);
	} catch (error) {
		res.status(500).json({ message: "Unable to generate dashboard overview.", error: error.message });
	}
}

module.exports = {
	getInventoryReport,
	getRequestReport,
	getApprovalAnalytics,
	getDistributionReport,
	getResourceDemandReport,
	getAuditLogReport,
	getDashboardOverview,
};
