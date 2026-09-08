const { campusFilter, canAccessCampus } = require("../middleware/campusScope");
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
	const rollback = [];
	let committed = false;
	try {
		const scheduleId = req.params.id || req.body.scheduleId || req.body.id;
		const quantityClaimed = req.body.quantityClaimed ?? req.body.quantity;
		const verificationNotes = req.body.verificationDetails || req.body.verificationNotes || "";

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
		if (!canAccessCampus(req, schedule)) return res.status(403).json({ message: "Record belongs to another campus." });
		if (req.user.role === "student" && schedule.student._id.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can only view your own claim schedule." });
		}

		if (schedule.status !== "Scheduled" && schedule.status !== "Confirmed") {
			return res.status(409).json({ message: "Only scheduled claims can be verified." });
		}

		if (!Number.isInteger(Number(quantityClaimed)) || Number(quantityClaimed) !== schedule.allocation.quantity) return res.status(400).json({ message: "Verify the full allocated quantity." });

		const scheduleBefore = schedule.toObject({ depopulate: true });
		const allocationBefore = schedule.allocation.toObject({ depopulate: true });

		// Update schedule
		const previousStatus = schedule.status;
		schedule.status = "Confirmed";
		schedule.verifiedBy = req.user._id;
		schedule.verifiedAt = new Date();
		schedule.verificationDetails = verificationNotes;
		schedule.quantityClaimed = quantityClaimed;
		await schedule.save();
		rollback.push(() => ClaimSchedule.replaceOne({ _id: schedule._id, __v: schedule.__v }, { ...scheduleBefore, __v: schedule.__v + 1 }));

		// Update allocation
		const allocation = schedule.allocation;
		allocation.status = "Verified";
		allocation.verifiedDate = new Date();
		await allocation.save();
		rollback.push(() => Allocation.replaceOne({ _id: allocation._id, __v: allocation.__v }, { ...allocationBefore, __v: allocation.__v + 1 }));

		const request = await Request.findById(allocation.request);
		if (request) {
			request.status = "claimed";
			request.claimedAt = new Date();
			request.claimedBy = schedule.student?.name || "Student";
			await request.save();
		}

		committed = true;

		// Audit log
		await createAuditLog(
			req.user,
			"Claim Verified",
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

		res.status(200).json({ 
			message: "Claim verified successfully",
			claimSchedule: schedule,
			schedule
		});
	} catch (error) {
		if (!committed) for (const undo of rollback.reverse()) await undo();
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to verify claim.", error: error.message });
	}
}

// ============================================
// STEP 8: RELEASE RESOURCE (Mark as released/completed)
// ============================================

async function releaseAllocation(req, res) {
	const rollback = [];
	let committed = false;
	try {
		const allocationId = req.params.allocationId || req.params.id || req.body.allocationId || req.body.id;
		const quantityDelivered = req.body.quantityDelivered ?? req.body.quantity ?? null;
		const distributionNotes = req.body.distributionNotes || req.body.notes || "";
		const distributionLocation = req.body.distributionLocation || req.body.location || "";

		const allocation = await Allocation.findById(allocationId)
			.populate("request")
			.populate("student", "name email")
			.populate("resource", "name");

		if (!allocation) {
			return res.status(404).json({ message: "Allocation not found." });
		}
		if (!canAccessCampus(req, allocation)) return res.status(403).json({ message: "Record belongs to another campus." });

		if (allocation.status !== "Verified") {
			return res.status(409).json({ message: "Only verified allocations can be released." });
		}
		if (quantityDelivered !== null && (!Number.isInteger(Number(quantityDelivered)) || Number(quantityDelivered) < 1 || Number(quantityDelivered) !== allocation.quantity)) {
			return res.status(400).json({ message: `Delivered quantity must be between 1 and ${allocation.quantity}.` });
		}
		const existingDistribution = await Distribution.findOne({ allocation: allocation._id });
		if (existingDistribution) return res.status(409).json({ message: "This allocation has already been released." });

		const request = allocation.request;
		const schedule = await ClaimSchedule.findOne({ allocation: allocationId });
		if (!request || !schedule || schedule.status !== "Confirmed") return res.status(409).json({ message: "Verify the claim schedule before release." });
		const previousAllocStatus = allocation.status;
		const allocationBefore = allocation.toObject({ depopulate: true });
		const scheduleBefore = schedule.toObject({ depopulate: true });
		const requestBefore = request.toObject({ depopulate: true });
		allocation.status = "Released";
		allocation.releasedDate = new Date();
		await allocation.save();
		rollback.push(() => Allocation.replaceOne({ _id: allocation._id, __v: allocation.__v }, { ...allocationBefore, __v: allocation.__v + 1 }));
		const inventory = await Inventory.findOneAndUpdate(
			{ resource: allocation.resource._id, reserved: { $gte: allocation.quantity } },
			{ $inc: { reserved: -allocation.quantity, issued: allocation.quantity } },
			{ returnDocument: "after" }
		);
		if (!inventory) {
			await rollback.pop()();
			return res.status(409).json({ message: "Reserved stock is unavailable." });
		}
		rollback.push(() => Inventory.updateOne({ _id: inventory._id }, { $inc: { reserved: allocation.quantity, issued: -allocation.quantity } }));
		schedule.status = "Completed";
		await schedule.save();
		rollback.push(() => ClaimSchedule.replaceOne({ _id: schedule._id, __v: schedule.__v }, { ...scheduleBefore, __v: schedule.__v + 1 }));

		// Update request
		const previousReqStatus = request.status;
		request.status = "completed";
		request.claimedAt = request.claimedAt || new Date();
		request.claimedBy = request.claimedBy || allocation.student.name;
		request.releasedAt = new Date();
		request.releasedBy = req.user._id;
		await request.save();
		rollback.push(() => Request.replaceOne({ _id: request._id, __v: request.__v }, { ...requestBefore, __v: request.__v + 1 }));

		const resourceBefore = await Resource.findById(allocation.resource._id).lean();
		// Update resource status
		await Resource.findByIdAndUpdate(
			allocation.resource._id,
			{ status: inventory.available > 0 ? "Available" : "Issued" },
			{ returnDocument: "after" }
		);

		rollback.push(() => Resource.updateOne({ _id: allocation.resource._id }, { status: resourceBefore.status }));

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
			distributionLocation,
			referenceId: `DIST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toLowerCase()}`
		});

		committed = true;

		// Audit log
		await createAuditLog(
			req.user,
			"Allocation Released",
			"Allocation",
			allocation._id,
			previousAllocStatus,
			"Released",
			`Released by ${req.user.name}. Distribution ID: ${distribution.referenceId}`
		);

		// Audit log for request completion
		await createAuditLog(
			req.user,
			"Request Completed",
			"Request",
			request._id,
			previousReqStatus,
			"completed",
			`Request completed and resource delivered to ${allocation.student.name}`
		);

		// Notify student
		await sendNotification(
			allocation.student._id,
			"release",
			"Resource Released! 🎉",
			`Your request for ${allocation.resource.name} has been completed and the resource has been delivered.`,
			distribution._id,
			"/distribution-history"
		);

		res.status(201).json({ 
			message: "Allocation released successfully",
			allocation,
			distribution,
			distributionRecord: distribution
		});
	} catch (error) {
		if (!committed) for (const undo of rollback.reverse()) await undo();
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to release allocation.", error: error.message });
	}
}

// ============================================
// RETRIEVAL FUNCTIONS
// ============================================

async function getMySchedules(req, res) {
	try {
		const schedules = await ClaimSchedule.find({ student: req.user._id })
			.populate("resource", "name category")
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
			schedules: schedules.map(schedule => ({
				...schedule.toObject(),
				pickupDate: schedule.pickupDate ? new Date(schedule.pickupDate).toISOString().slice(0, 10) : null,
			}))
		});
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load claim schedules.", error: error.message });
	}
}

async function getAllSchedules(req, res) {
	try {
		const { status, campus, studentId } = req.query;
		const filter = campusFilter(req);

		if (status) filter.status = status;
		Object.assign(filter, campusFilter(req));
		if (studentId) filter.student = studentId;
		if (req.user.role === "staff") {
			const authorizedAllocations = await Allocation.find({
				$or: [
					{ assignedStaff: req.user._id },
					{ assignedStaff: { $exists: false } },
					{ assignedStaff: null },
				],
			}).select("_id").lean();
			filter.allocation = { $in: authorizedAllocations.map((allocation) => allocation._id) };
		}

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
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load schedules.", error: error.message });
	}
}

async function getDistributions(req, res) {
	try {
		const filter = campusFilter(req);
		if (req.user.role === "student") {
			filter.student = req.user._id;
		}

		const { status, campus } = req.query;
		if (status) filter.status = status;
		Object.assign(filter, campusFilter(req));

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
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load distributions.", error: error.message });
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
		if (!canAccessCampus(req, distribution)) return res.status(403).json({ message: "Record belongs to another campus." });
		if (req.user.role === "student" && distribution.student._id.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can only view your own distribution history." });
		}

		res.json({ distribution });
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load distribution.", error: error.message });
	}
}

async function getDistributionsByStatus(req, res) {
	try {
		const { status } = req.params;
		const validStatuses = ["Pending", "Prepared", "Released", "Received", "Completed"];

		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: "Invalid status." });
		}

		const distributions = await Distribution.find({ ...campusFilter(req), status })
			.populate("student", "name email")
			.populate("resource", "name")
			.sort({ createdAt: -1 });

		res.json({ 
			status,
			count: distributions.length,
			distributions 
		});
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load distributions.", error: error.message });
	}
}

// ============================================
// MONITORING & TRACKING
// ============================================

async function getDistributionProgress(req, res) {
	try {
		
		const filter = campusFilter(req);

		const claimed = await Request.countDocuments({ ...filter, status: "claimed" });
		const cancelled = await Request.countDocuments({ ...filter, status: "cancelled" });
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
				claimed,
				cancelled,
				released,
				completed,
				rejected,
				percentageCompleted: totalRequests > 0 ? Math.round((completed / totalRequests) * 100) : 0
			}
		});
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load distribution progress.", error: error.message });
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