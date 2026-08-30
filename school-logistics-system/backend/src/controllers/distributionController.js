const Allocation = require("../models/Allocation");
const ClaimSchedule = require("../models/ClaimSchedule");
const Inventory = require("../models/Inventory");
const Request = require("../models/Request");
const Distribution = require("../models/Distribution");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const Resource = require("../models/Resource");

// ============================================
// HELPER FUNCTIONS
// ============================================

const createAuditLog = async (actor, action, entity, entityId, previousStatus, newStatus, details = "") => {
	await AuditLog.create({
		actor,
		action,
		entity,
		entityId,
		previousStatus,
		newStatus,
		details,
		actorRole: actor.role
	});
};

const sendNotification = async (userId, type, title, message, relatedEntityId = null, actionUrl = "") => {
	await Notification.create({
		user: userId,
		type,
		title,
		message,
		relatedEntityId,
		actionUrl,
		sent: true,
		sentAt: new Date()
	});
};

// ============================================
// STEP 7: CLAIM VERIFICATION (Staff verifies identity)
// ============================================

async function verifyClaimIdentity(req, res) {
	try {
		const { scheduleId, quantityClaimed, verificationNotes = "" } = req.body;

		if (!scheduleId || !quantityClaimed || quantityClaimed < 1) {
			return res.status(400).json({ message: "Schedule ID and quantity are required." });
		}

		const schedule = await ClaimSchedule.findById(scheduleId)
			.populate("allocation")
			.populate("student", "name email")
			.populate("resource", "name");

		if (!schedule) {
			return res.status(404).json({ message: "Claim schedule not found." });
		}

		if (schedule.status !== "Scheduled") {
			return res.status(409).json({ message: "Only scheduled claims can be verified." });
		}

		// Update schedule
		const previousStatus = schedule.status;
		schedule.status = "Confirmed";
		schedule.verifiedBy = req.user._id;
		schedule.verifiedAt = new Date();
		schedule.verificationDetails = verificationNotes;
		schedule.quantityClaimed = quantityClaimed;
		await schedule.save();

		// Update allocation
		const allocation = schedule.allocation;
		allocation.status = "Verified";
		allocation.verifiedDate = new Date();
		await allocation.save();

		// Audit log
		await createAuditLog(
			req.user._id,
			"claim_verified",
			"ClaimSchedule",
			schedule._id,
			previousStatus,
			"Confirmed",
			`Verified by ${req.user.name}. Quantity: ${quantityClaimed}`
		);

		// Notify student
		await sendNotification(
			schedule.student._id,
			"general",
			"Claim Verified ✅",
			`Your identity has been verified for ${schedule.resource.name}. Resource will be released shortly.`,
			schedule._id
		);

		res.json({ 
			message: "Claim verified successfully", 
			schedule 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to verify claim.", error: error.message });
	}
}

// ============================================
// STEP 8: RELEASE RESOURCE (Mark as released/completed)
// ============================================

async function releaseAllocation(req, res) {
	try {
		const { allocationId, quantityDelivered = null, distributionNotes = "" } = req.body;

		const allocation = await Allocation.findById(allocationId)
			.populate("request")
			.populate("student", "name email")
			.populate("resource", "name");

		if (!allocation) {
			return res.status(404).json({ message: "Allocation not found." });
		}

		if (allocation.status !== "Verified") {
			return res.status(409).json({ message: "Only verified allocations can be released." });
		}

		// Get claim schedule for more info
		const schedule = await ClaimSchedule.findOne({ allocation: allocationId });

		// Update inventory
		const inventory = await Inventory.findOneAndUpdate(
			{ 
				resource: allocation.resource._id, 
				reserved: { $gte: allocation.quantity } 
			},
			{ 
				$inc: { 
					reserved: -allocation.quantity, 
					issued: allocation.quantity 
				} 
			},
			{ new: true }
		);

		if (!inventory) {
			return res.status(409).json({ message: "Reserved stock is unavailable." });
		}

		// Update allocation
		const previousAllocStatus = allocation.status;
		allocation.status = "Released";
		allocation.releasedDate = new Date();
		await allocation.save();

		// Update request
		const request = allocation.request;
		const previousReqStatus = request.status;
		request.status = "claimed";
		request.claimedAt = new Date();
		request.claimedBy = allocation.student.name;
		request.releasedAt = new Date();
		request.releasedBy = req.user._id;
		await request.save();

		// Update resource status
		const updatedResource = await Resource.findByIdAndUpdate(
			allocation.resource._id,
			{ status: inventory.available > 0 ? "Available" : "Issued" },
			{ new: true }
		);

		// Create distribution record
		const distribution = await Distribution.create({
			allocation: allocation._id,
			request: allocation.request._id,
			claimSchedule: schedule?._id || null,
			student: allocation.student._id,
			resource: allocation.resource._id,
			quantity: allocation.quantity,
			quantityRequested: allocation.quantity,
			quantityDelivered: quantityDelivered || allocation.quantity,
			status: "Released",
			releasedBy: req.user._id,
			releasedAt: new Date(),
			claimedBy: allocation.student.name,
			claimedAt: new Date(),
			campus: allocation.campus,
			notes: distributionNotes,
			referenceId: `DIST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
		});

		// Audit log
		await createAuditLog(
			req.user._id,
			"allocation_released",
			"Allocation",
			allocation._id,
			previousAllocStatus,
			"Released",
			`Released by ${req.user.name}. Distribution ID: ${distribution.referenceId}`
		);

		// Audit log for request completion
		await createAuditLog(
			req.user._id,
			"request_completed",
			"Request",
			request._id,
			previousReqStatus,
			"claimed",
			`Request completed and resource delivered to ${allocation.student.name}`
		);

		// Notify student
		await sendNotification(
			allocation.student._id,
			"release",
			"Resource Released! 🎉",
			`Your request for ${allocation.resource.name} has been completed and the resource has been delivered.`,
			distribution._id,
			"/student/history"
		);

		res.json({ 
			message: "Allocation released successfully", 
			allocation,
			distribution
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to release allocation.", error: error.message });
	}
}

// ============================================
// RETRIEVAL FUNCTIONS
// ============================================

async function getMySchedules(req, res) {
	try {
		const schedules = await ClaimSchedule.find({ student: req.user._id })
			.populate({
				path: "allocation",
				populate: {
					path: "resource",
					select: "name category"
				}
			})
			.populate("student", "name email")
			.sort({ pickupDate: 1 });

		res.json({ 
			count: schedules.length,
			schedules 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load claim schedules.", error: error.message });
	}
}

async function getAllSchedules(req, res) {
	try {
		const { status, campus, studentId } = req.query;
		const filter = {};

		if (status) filter.status = status;
		if (campus) filter.campus = campus;
		if (studentId) filter.student = studentId;

		const schedules = await ClaimSchedule.find(filter)
			.populate("allocation", "quantity campus")
			.populate("student", "name email")
			.populate("resource", "name category")
			.sort({ pickupDate: -1 });

		res.json({ 
			count: schedules.length,
			schedules 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load schedules.", error: error.message });
	}
}

async function getDistributions(req, res) {
	try {
		const filter = {};
		if (req.user.role === "student") {
			filter.student = req.user._id;
		}

		const { status, campus } = req.query;
		if (status) filter.status = status;
		if (campus) filter.campus = campus;

		const distributions = await Distribution.find(filter)
			.populate("student", "name email")
			.populate("resource", "name category")
			.populate("releasedBy", "name")
			.sort({ createdAt: -1 });

		res.json({ 
			count: distributions.length,
			distributions 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load distributions.", error: error.message });
	}
}

async function getDistributionById(req, res) {
	try {
		const distribution = await Distribution.findById(req.params.id)
			.populate("student", "name email campus")
			.populate("resource", "name category")
			.populate("releasedBy", "name")
			.populate("request", "status");

		if (!distribution) {
			return res.status(404).json({ message: "Distribution not found." });
		}

		res.json({ distribution });
	} catch (error) {
		res.status(500).json({ message: "Unable to load distribution.", error: error.message });
	}
}

async function getDistributionsByStatus(req, res) {
	try {
		const { status } = req.params;
		const validStatuses = ["Pending", "Prepared", "Released", "Received", "Completed"];

		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: "Invalid status." });
		}

		const distributions = await Distribution.find({ status })
			.populate("student", "name email")
			.populate("resource", "name")
			.sort({ createdAt: -1 });

		res.json({ 
			status,
			count: distributions.length,
			distributions 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load distributions.", error: error.message });
	}
}

// ============================================
// MONITORING & TRACKING
// ============================================

async function getDistributionProgress(req, res) {
	try {
		const { campusFilter } = req.query;
		const filter = campusFilter ? { campus: campusFilter } : {};

		const totalRequests = await Request.countDocuments(filter);
		const pending = await Request.countDocuments({ ...filter, status: "pending" });
		const approved = await Request.countDocuments({ ...filter, status: "approved" });
		const readyForClaim = await Request.countDocuments({ ...filter, status: "ready_for_claim" });
		const released = await Request.countDocuments({ ...filter, status: "released" });
		const completed = await Request.countDocuments({ ...filter, status: "completed" });
		const rejected = await Request.countDocuments({ ...filter, status: "rejected" });

		res.json({
			summary: {
				total: totalRequests,
				pending,
				approved,
				readyForClaim,
				released,
				completed,
				rejected,
				percentageCompleted: totalRequests > 0 ? Math.round((completed / totalRequests) * 100) : 0
			}
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load distribution progress.", error: error.message });
	}
}

module.exports = {
	// Process
	verifyClaimIdentity,
	releaseAllocation,
	
	// Retrieve
	getMySchedules,
	getAllSchedules,
	getDistributions,
	getDistributionById,
	getDistributionsByStatus,
	getDistributionProgress,
};