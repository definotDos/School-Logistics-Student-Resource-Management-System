const Allocation = require("../models/Allocation");
const ClaimSchedule = require("../models/ClaimSchedule");
const Request = require("../models/Request");
const Resource = require("../models/Resource");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatAllocation = (allocation) => ({
	id: allocation._id,
	request: allocation.request ? allocation.request._id : null,
	student: allocation.student,
	resource: allocation.resource,
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
		const { allocationId, notes = "" } = req.body;

		const allocation = await Allocation.findById(allocationId)
			.populate("request")
			.populate("student", "name email")
			.populate("resource", "name category");

		if (!allocation) {
			return res.status(404).json({ message: "Allocation not found." });
		}

		if (allocation.status !== "Reserved") {
			return res.status(409).json({ message: "Only reserved allocations can be processed." });
		}

		// Update allocation status
		const previousStatus = allocation.status;
		allocation.status = "Scheduled";
		allocation.notes = notes;
		await allocation.save();

		// Audit log
		await createAuditLog(
			req.user._id,
			"allocation_processed",
			"Allocation",
			allocation._id,
			previousStatus,
			"Scheduled",
			`Admin processed allocation. Notes: ${notes}`
		);

		// Notify student and staff
		await sendNotification(
			allocation.student._id,
			"general",
			"Resource Allocated",
			`Your ${allocation.resource.name} has been allocated. A schedule will be assigned soon.`,
			allocation._id
		);

		res.json({ 
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
		const { allocationId, pickupDate, startTime, endTime, location } = req.body;

		// Validate input
		if (!pickupDate || !startTime || !endTime || !location?.trim()) {
			return res.status(400).json({ message: "All schedule fields are required." });
		}

		const allocation = await Allocation.findById(allocationId)
			.populate("request")
			.populate("student", "name email campus")
			.populate("resource", "name");

		if (!allocation) {
			return res.status(404).json({ message: "Allocation not found." });
		}

		if (allocation.status !== "Scheduled") {
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
			"schedule_created",
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
			schedule: claimSchedule 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to create claim schedule.", error: error.message });
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
		}

		const { status, campus } = req.query;
		if (status) filter.status = status;
		if (campus) filter.campus = campus;

		const allocations = await Allocation.find(filter)
			.populate("student", "name email campus grade")
			.populate("resource", "name category")
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
			.populate("student", "name email campus grade")
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

		const allocations = await Allocation.find({ status })
			.populate("student", "name email campus")
			.populate("resource", "name category")
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
	
	// Retrieve
	listAllocations,
	getAllocationById,
	getStudentAllocations,
	getAllocationsByStatus,
};
