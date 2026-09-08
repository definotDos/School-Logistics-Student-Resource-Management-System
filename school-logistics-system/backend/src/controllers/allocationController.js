const { campusFilter, canAccessCampus } = require("../middleware/campusScope");
const Allocation = require("../models/Allocation");
const ClaimSchedule = require("../models/ClaimSchedule");
const Request = require("../models/Request");
const Resource = require("../models/Resource");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatAllocation = (allocation) => ({
	_id: allocation._id,
	id: allocation._id,
	request: allocation.request ? allocation.request._id : null,
	student: allocation.student,
	resource: allocation.resource,
	assignedStaff: allocation.assignedStaff,
	quantity: allocation.quantity,
	status: allocation.status,
	campus: allocation.campus,
	allocationDate: allocation.allocationDate,
	scheduledDate: allocation.scheduledDate,
	notes: allocation.notes,
});

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
// STEP 4: ADMIN PROCESS APPROVAL (Reserve Resource)
// ============================================

async function processAllocation(req, res) {
	try {
		const requestId = req.params.id || req.body.requestId || req.body.allocationId || req.body.id;
		const notes = req.body.notes || "";

		let allocation = await Allocation.findOne({ request: requestId })
			.populate("request")
			.populate("student", "name email studentId avatar")
			.populate("resource", "name category");

		if (!allocation && requestId) {
			allocation = await Allocation.findById(requestId)
				.populate("request")
				.populate("student", "name email studentId avatar")
				.populate("resource", "name category");
		}

		if (!allocation) {
			return res.status(404).json({ message: "Allocation not found." });
		}
		if (!canAccessCampus(req, allocation)) return res.status(403).json({ message: "Record belongs to another campus." });
		if (allocation.status !== "Reserved") {
			return res.status(409).json({ message: "This allocation has already been processed." });
		}

		const previousStatus = allocation.status;
		allocation.notes = notes;
		if (allocation.status === "Reserved") {
			await allocation.save();
		} else {
			allocation.status = "Reserved";
			await allocation.save();
		}

		await createAuditLog(
			req.user,
			"Allocation Processed",
			"Allocation",
			allocation._id,
			previousStatus,
			allocation.status,
			`Admin processed allocation. Notes: ${notes}`
		);

		if (allocation.student && allocation.resource) {
			await sendNotification(
				allocation.student._id,
				"general",
				"Resource Allocated",
				`Your ${allocation.resource.name} has been allocated. A schedule will be assigned soon.`,
				allocation._id
			);
		}

		res.status(201).json({
			message: "Allocation processed",
			allocation: formatAllocation(allocation)
		});
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to process allocation.", error: error.message });
	}
}

// ============================================
// STEP 5: LOGISTICS STAFF CREATE SCHEDULE
// ============================================

async function createClaimSchedule(req, res) {
	const rollback = [];
	let committed = false;
	try {
		const allocationId = req.params.id || req.body.allocationId || req.body.id;
		const { pickupDate, startTime, endTime, location } = req.body;

		// Validate input
		if (!pickupDate || !startTime || !endTime || !location?.trim()) {
			return res.status(400).json({ message: "All schedule fields are required." });
		}

		const allocation = await Allocation.findById(allocationId)
			.populate("request")
			.populate("student", "name email campus studentId avatar")
			.populate("resource", "name");

		if (!allocation) {
			return res.status(404).json({ message: "Allocation not found." });
		}
		if (!canAccessCampus(req, allocation)) return res.status(403).json({ message: "Record belongs to another campus." });
		if (req.user.role === "student" && allocation.student._id.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can only view your own allocation." });
		}

		if (allocation.status !== "Reserved" && allocation.status !== "Scheduled") {
			return res.status(409).json({ message: "Allocation must be processed before scheduling." });
		}

		if (Number.isNaN(Date.parse(pickupDate)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime) return res.status(400).json({ message: "Provide a valid date and an end time after the start time." });

		// Check if schedule already exists
		const existingSchedule = await ClaimSchedule.findOne({ allocation: allocationId });
		if (existingSchedule) {
			return res.status(409).json({ message: "Claim schedule already exists for this allocation." });
		}

		const allocationBefore = allocation.toObject({ depopulate: true });

		// Create claim schedule
		const claimSchedule = await ClaimSchedule.create({
			allocation: allocation._id,
			request: allocation.request._id,
			student: allocation.student._id,
			resource: allocation.resource._id,
			pickupDate: new Date(pickupDate),
			startTime,
			endTime,
			location,
			campus: allocation.campus,
			status: "Scheduled"
		});

		rollback.push(() => ClaimSchedule.deleteOne({ _id: claimSchedule._id }));

		// Update allocation
		allocation.scheduledDate = new Date(pickupDate);
		allocation.status = "Scheduled"; // Keep as Scheduled
		await allocation.save();
		rollback.push(() => Allocation.replaceOne({ _id: allocation._id, __v: allocation.__v }, { ...allocationBefore, __v: allocation.__v + 1 }));

		// Update request status to ready_for_claim
		const request = allocation.request;
		request.status = "ready_for_claim";
		await request.save();

		committed = true;

		// Audit log
		await createAuditLog(
			req.user,
			"Schedule Created",
			"ClaimSchedule",
			claimSchedule._id,
			null,
			"Scheduled",
			`Schedule created for ${allocation.student.name} on ${pickupDate}`
		);

		// Notify student
		const pickupDateTime = new Date(pickupDate).toLocaleDateString('en-US', { 
			weekday: 'long', 
			year: 'numeric', 
			month: 'long', 
			day: 'numeric' 
		});

		await sendNotification(
			allocation.student._id,
			"schedule",
			"Claim Schedule Assigned! 📅",
			`Your claim schedule for ${allocation.resource.name} is set for ${pickupDateTime} from ${startTime} to ${endTime} at ${location}. Please arrive on time!`,
			claimSchedule._id,
			"/claim-schedule"
		);

		res.status(201).json({ 
			message: "Claim schedule created successfully",
			claimSchedule,
			schedule: claimSchedule
		});
	} catch (error) {
		if (!committed) for (const undo of rollback.reverse()) await undo();
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to create claim schedule.", error: error.message });
	}
}

async function assignStaff(req, res) {
	try {
		const { staffId } = req.body;
		if (!staffId) return res.status(400).json({ message: "Staff member is required." });

		const staff = await User.findOne({ _id: staffId, role: "staff", status: "active" });
		if (!staff) return res.status(404).json({ message: "Active staff member was not found." });

		const allocation = await Allocation.findById(req.params.id)
			.populate("student", "name email studentId avatar")
			.populate("resource", "name category");
		if (!allocation) return res.status(404).json({ message: "Allocation not found." });
		if (!canAccessCampus(req, allocation)) return res.status(403).json({ message: "Record belongs to another campus." });
		if (!["Reserved", "Scheduled"].includes(allocation.status)) return res.status(409).json({ message: "Only reserved or scheduled allocations can be assigned." });

		if (staff.campus !== allocation.campus) return res.status(409).json({ message: "Assign staff from the allocation campus." });
		allocation.assignedStaff = staff._id;
		await allocation.save();
		await createAuditLog(req.user, "Staff Assigned", "Allocation", allocation._id, null, allocation.status, `Assigned to ${staff.name}`);
		await sendNotification(staff._id, "general", "Distribution Assignment", `You are assigned to distribute ${allocation.resource.name} to ${allocation.student.name}.`, allocation._id);

		res.json({ message: "Staff member assigned successfully.", allocation: formatAllocation(allocation) });
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to assign staff member.", error: error.message });
	}
}

// ============================================
// RETRIEVAL FUNCTIONS
// ============================================

async function listAllocations(req, res) {
	try {
		const filter = campusFilter(req);
		if (req.user.role === "student") {
			filter.student = req.user._id;
		} else if (req.user.role === "staff") {
			filter.$or = [{ assignedStaff: req.user._id }, { assignedStaff: null }];
		}

		const { status, campus } = req.query;
		if (status) filter.status = status;
		Object.assign(filter, campusFilter(req));

		const allocations = await Allocation.find(filter)
			.populate("student", "name email campus grade studentId avatar")
			.populate("resource", "name category")
			.populate("assignedStaff", "name email")
			.populate("request", "status resource quantity")
			.sort({ createdAt: -1 });

		res.json({ 
			count: allocations.length,
			allocations: allocations.map(formatAllocation) 
		});
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load allocations.", error: error.message });
	}
}

async function getAllocationById(req, res) {
	try {
		const allocation = await Allocation.findById(req.params.id)
			.populate("student", "name email campus grade studentId avatar")
			.populate("resource", "name category")
			.populate("request", "status resource quantity")
			.populate("allocatedBy", "name");

		if (!allocation) {
			return res.status(404).json({ message: "Allocation not found." });
		}
		if (!canAccessCampus(req, allocation)) return res.status(403).json({ message: "Record belongs to another campus." });

		if (req.user.role === "student" && allocation.student?._id.toString() !== req.user._id.toString()) return res.status(403).json({ message: "You can only view your own allocation." });

		// Also get the claim schedule if it exists
		const claimSchedule = await ClaimSchedule.findOne({ allocation: allocation._id });

		res.json({ 
			allocation: formatAllocation(allocation),
			claimSchedule: claimSchedule || null
		});
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load allocation.", error: error.message });
	}
}

async function getStudentAllocations(req, res) {
	try {
		const allocations = await Allocation.find({ student: req.user._id })
			.populate("resource", "name category")
			.populate("request", "status resource quantity")
			.sort({ createdAt: -1 });

		// Get claim schedules for each allocation
		const allocationsWithSchedules = await Promise.all(
			allocations.map(async (allocation) => {
				const schedule = await ClaimSchedule.findOne({ allocation: allocation._id });
				return {
					...allocation.toObject(),
					schedule: schedule || null
				};
			})
		);

		res.json({ 
			count: allocations.length,
			allocations: allocationsWithSchedules 
		});
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load your allocations.", error: error.message });
	}
}

async function getAllocationsByStatus(req, res) {
	try {
		const { status } = req.params;
		const validStatuses = ["Reserved", "Scheduled", "Verified", "Released"];

		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: "Invalid status." });
		}

		const filter = { ...campusFilter(req), status };
		if (req.user.role === "staff") {
			filter.$or = [
				{ assignedStaff: req.user._id },
				{ assignedStaff: { $exists: false } },
				{ assignedStaff: null },
			];
		}
		const allocations = await Allocation.find(filter)
			.populate("student", "name email campus studentId avatar")
			.populate("resource", "name category")
			.populate("assignedStaff", "name email")
			.sort({ createdAt: -1 });

		res.json({ 
			status,
			count: allocations.length,
			allocations: allocations.map(formatAllocation) 
		});
	} catch (error) {
		res.status(error?.name === "VersionError" ? 409 : ["ValidationError", "CastError"].includes(error?.name) ? 400 : 500).json({ message: "Unable to load allocations.", error: error.message });
	}
}

module.exports = {
	// Create & Process
	processAllocation,
	createClaimSchedule,
	assignStaff,
	
	// Retrieve
	listAllocations,
	getAllocationById,
	getStudentAllocations,
	getAllocationsByStatus,
};
