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
			req.user._id,
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
		res.status(500).json({ message: "Unable to process allocation.", error: error.message });
	}
}

// ============================================
// STEP 5: LOGISTICS STAFF CREATE SCHEDULE
// ============================================

async function createClaimSchedule(req, res) {
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
		if (req.user.role === "student" && allocation.student._id.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can only view your own allocation." });
		}

		if (allocation.status !== "Reserved" && allocation.status !== "Scheduled") {
			return res.status(409).json({ message: "Allocation must be processed before scheduling." });
		}

		// Check if schedule already exists
		const existingSchedule = await ClaimSchedule.findOne({ allocation: allocationId });
		if (existingSchedule) {
			return res.status(409).json({ message: "Claim schedule already exists for this allocation." });
		}

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

		// Update allocation
		allocation.scheduledDate = new Date(pickupDate);
		allocation.status = "Scheduled"; // Keep as Scheduled
		await allocation.save();

		// Update request status to ready_for_claim
		const request = allocation.request;
		request.status = "ready_for_claim";
		await request.save();

		// Audit log
		await createAuditLog(
			req.user._id,
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
			"/student/schedule"
		);

		res.status(201).json({ 
			message: "Claim schedule created successfully",
			claimSchedule,
			schedule: claimSchedule
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to create claim schedule.", error: error.message });
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
		if (!["Reserved", "Scheduled"].includes(allocation.status)) return res.status(409).json({ message: "Only reserved or scheduled allocations can be assigned." });

		allocation.assignedStaff = staff._id;
		await allocation.save();
		await createAuditLog(req.user, "Staff Assigned", "Allocation", allocation._id, null, allocation.status, `Assigned to ${staff.name}`);
		await sendNotification(staff._id, "general", "Distribution Assignment", `You are assigned to distribute ${allocation.resource.name} to ${allocation.student.name}.`, allocation._id);

		res.json({ message: "Staff member assigned successfully.", allocation: formatAllocation(allocation) });
	} catch (error) {
		res.status(500).json({ message: "Unable to assign staff member.", error: error.message });
	}
}

// ============================================
// RETRIEVAL FUNCTIONS
// ============================================

async function listAllocations(req, res) {
	try {
		const filter = {};
		if (req.user.role === "student") {
			filter.student = req.user._id;
		} else if (req.user.role === "staff") {
			filter.assignedStaff = req.user._id;
		}

		const { status, campus } = req.query;
		if (status) filter.status = status;
		if (campus) filter.campus = campus;

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
		res.status(500).json({ message: "Unable to load allocations.", error: error.message });
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

		// Also get the claim schedule if it exists
		const claimSchedule = await ClaimSchedule.findOne({ allocation: allocation._id });

		res.json({ 
			allocation: formatAllocation(allocation),
			claimSchedule: claimSchedule || null
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load allocation.", error: error.message });
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
		res.status(500).json({ message: "Unable to load your allocations.", error: error.message });
	}
}

async function getAllocationsByStatus(req, res) {
	try {
		const { status } = req.params;
		const validStatuses = ["Reserved", "Scheduled", "Verified", "Released"];

		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: "Invalid status." });
		}

		const filter = { status };
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
		res.status(500).json({ message: "Unable to load allocations.", error: error.message });
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
