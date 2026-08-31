const Request = require("../models/Request");
const Allocation = require("../models/Allocation");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const Resource = require("../models/Resource");
const Inventory = require("../models/Inventory");

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatRequest = (request) => ({
	...request.toObject ? request.toObject() : request,
	id: `REQ-${request._id.toString().slice(-8).toUpperCase()}`,
	databaseId: request._id.toString(),
	resourceId: request.resource?.toString ? request.resource.toString() : request.resource,
	resource: request.resourceRef?.name || request.resource || "Resource",
	resourceName: request.resourceRef?.name || request.resource || "Resource",
	quantity: request.quantity,
	category: request.category,
	date: request.createdAt,
	status: request.status,
	eligibilityStatus: request.eligibilityStatus,
	approvedAt: request.approvedAt,
	rejectedAt: request.rejectedAt,
	releasedAt: request.releasedAt,
	studentId: request.student?.studentId || request.studentId || request.student?.id || "",
	avatar: request.student?.avatar || request.avatar || "",
	student: request.student ? {
		_id: request.student._id || request.student.id,
		id: request.student._id || request.student.id,
		name: request.student.name,
		email: request.student.email,
		studentId: request.student.studentId,
		avatar: request.student.avatar,
		campus: request.student.campus,
		grade: request.student.grade,
	} : undefined,
});

// Create audit log entry
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

// Send notification to user
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
// STEP 1: CREATE REQUEST (Student submits)
// ============================================

async function createRequest(req, res) {
	try {
		const { resource, category, quantity = 1, notes = "", reason = "" } = req.body;
		const resourceId = resource && (typeof resource === "string" ? resource.trim() : String(resource));
		
		// Validation
		if (!resourceId) {
			return res.status(400).json({ message: "Choose a resource before submitting." });
		}
		
		if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
			return res.status(400).json({ message: "Quantity must be a positive whole number." });
		}

		const resourceExists = await Resource.findById(resourceId);
		if (!resourceExists) {
			return res.status(404).json({ message: "Resource not found." });
		}

		if (Number(quantity) > (resourceExists.maxQuantityPerStudent || 5)) {
			return res.status(400).json({ message: `Quantity exceeds the maximum allowed per student (${resourceExists.maxQuantityPerStudent || 5}).` });
		}

		// Check for duplicate active requests
		const duplicate = await Request.findOne({ 
			student: req.user._id, 
			resource: resourceId, 
			status: { $in: ["pending", "approved", "ready_for_claim"] } 
		});
		
		if (duplicate) {
			return res.status(400).json({ message: "You already have an active request for this resource." });
		}

		// Create request with initial status
		const request = await Request.create({
			student: req.user._id,
			resource: resourceId,
			quantity: Number(quantity),
			category: category?.trim() || "Other",
			campus: req.user.campus,
			status: "pending",
			eligibilityStatus: "pending",
			notes: notes?.trim() || reason?.trim() || "",
			priority: "medium"
		});

		// Audit log
		await createAuditLog(
			req.user._id,
			"request_created",
			"Request",
			request._id,
			null,
			"pending",
			`Student ${req.user.name} submitted request for ${resource}`
		);

		// Notify staff to review
		// Staff will see in their dashboard

		await request.populate("student", "name email campus grade studentId avatar");
		res.status(201).json({ 
			message: "Request submitted successfully", 
			request: formatRequest(request) 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to submit request.", error: error.message });
	}
}

// ============================================
// STEP 2: CHECK ELIGIBILITY (Staff verifies)
// ============================================

async function verifyEligibility(req, res) {
	try {
		const requestId = req.params.id || req.body.requestId || req.body.id;
		const isEligible = req.body.eligible ?? req.body.isEligible;
		const notes = req.body.notes || req.body.note || "";

		const request = await Request.findById(requestId);
		if (!request) {
			return res.status(404).json({ message: "Request not found." });
		}

		if (request.status !== "pending") {
			return res.status(409).json({ message: "Only pending requests can be verified." });
		}

		// Update eligibility
		const previousEligibility = request.eligibilityStatus;
		request.eligibilityChecked = true;
		request.eligibilityStatus = isEligible ? "eligible" : "ineligible";
		request.checkedBy = req.user._id;
		request.checkedAt = new Date();
		request.notes = notes;

		await request.save();

		// Audit log
		await createAuditLog(
			req.user._id,
			"eligibility_verified",
			"Request",
			request._id,
			previousEligibility,
			request.eligibilityStatus,
			`Staff ${req.user.name} verified eligibility: ${isEligible ? "Eligible" : "Ineligible"}`
		);

		await request.populate("student", "name email studentId avatar");
		res.json({ 
			message: "Eligibility verified", 
			request: formatRequest(request) 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to verify eligibility.", error: error.message });
	}
}

// ============================================
// STEP 3: APPROVE/REJECT REQUEST (Admin/Staff)
// ============================================

async function approveRequest(req, res) {
	try {
		const requestId = req.params.id || req.body.requestId || req.body.id;
		const notes = req.body.notes || req.body.reason || "";

		const request = await Request.findById(requestId);
		if (!request) {
			return res.status(404).json({ message: "Request not found." });
		}

		if (request.status !== "pending") {
			return res.status(409).json({ message: "Only pending requests can be approved." });
		}

		// Check if eligible
		if (request.eligibilityStatus !== "eligible") {
			return res.status(409).json({ message: "Only eligible students can be approved." });
		}

		// Get resource
		const resource = await Resource.findById(request.resource) || await Resource.findOne({ name: request.resource });
		if (!resource) {
			return res.status(409).json({ message: "This resource is no longer in the catalog." });
		}

		// Check inventory
		const inventory = await Inventory.findOne({ resource: resource._id });
		if (!inventory || inventory.available < request.quantity) {
			return res.status(409).json({ message: "Insufficient available stock for this request." });
		}

		// Reserve inventory
		await Inventory.findByIdAndUpdate(
			inventory._id,
			{ 
				$inc: { 
					available: -request.quantity, 
					reserved: request.quantity 
				} 
			},
			{ new: true }
		);

		// Update request
		const previousStatus = request.status;
		request.status = "approved";
		request.approvedBy = req.user._id;
		request.approvedAt = new Date();
		request.resourceRef = resource._id;
		request.reason = notes;

		await request.save();

		// Create allocation
		const allocation = await Allocation.create({
			request: request._id,
			student: request.student,
			resource: resource._id,
			quantity: request.quantity,
			campus: request.campus,
			allocatedBy: req.user._id,
			status: "Reserved"
		});

		// Audit log
		await createAuditLog(
			req.user._id,
			"request_approved",
			"Request",
			request._id,
			previousStatus,
			"approved",
			`Approved by ${req.user.name}. Allocation created: ${allocation._id}`
		);

		// Notify student
		await sendNotification(
			request.student,
			"approval",
			"Request Approved! ✅",
			`Your request for ${request.quantity} ${request.resource} has been approved. Next: A schedule will be assigned for you to claim the resource.`,
			request._id,
			"/student/requests"
		);

		// Notify staff to create schedule
		await sendNotification(
			req.user._id,
			"general",
			"Approved Request - Action Needed",
			`Request REQ-${request._id.toString().slice(-8).toUpperCase()} has been approved. Next: Assign a claim schedule.`,
			request._id
		);

		await request.populate("student", "name email studentId avatar");
		res.json({ 
			message: "Request approved successfully", 
			request: formatRequest(request),
			allocation: allocation 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to approve request.", error: error.message });
	}
}

async function rejectRequest(req, res) {
	try {
		const { requestId, rejectionReason } = req.body;

		if (!rejectionReason?.trim()) {
			return res.status(400).json({ message: "Rejection reason is required." });
		}

		const request = await Request.findById(requestId);
		if (!request) {
			return res.status(404).json({ message: "Request not found." });
		}

		if (request.status !== "pending") {
			return res.status(409).json({ message: "Only pending requests can be rejected." });
		}

		// Update request
		const previousStatus = request.status;
		request.status = "rejected";
		request.rejectedBy = req.user._id;
		request.rejectedAt = new Date();
		request.rejectionReason = rejectionReason.trim();

		await request.save();

		// Audit log
		await createAuditLog(
			req.user._id,
			"request_rejected",
			"Request",
			request._id,
			previousStatus,
			"rejected",
			`Rejected by ${req.user.name}. Reason: ${rejectionReason}`
		);

		// Notify student
		await sendNotification(
			request.student,
			"rejection",
			"Request Rejected",
			`Your request for ${request.resource} has been rejected. Reason: ${rejectionReason}`,
			request._id,
			"/student/requests"
		);

		await request.populate("student", "name email studentId avatar");
		res.json({ 
			message: "Request rejected", 
			request: formatRequest(request) 
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to reject request.", error: error.message });
	}
}

// ============================================
// RETRIEVAL FUNCTIONS
// ============================================

async function getMyRequests(req, res) {
	try {
		if (req.user.role !== "student") {
			return res.json({ requests: [] });
		}

		const requests = await Request.find({ student: req.user._id })
			.populate("resourceRef", "name category")
			.populate("student", "name email campus grade studentId avatar")
			.sort({ createdAt: -1 });

		const resourceIds = [...new Set(requests.map((request) => request.resource?.toString()).filter(Boolean))];
		const resources = await Resource.find({ _id: { $in: resourceIds } }).lean();
		const resourceMap = new Map(resources.map((resource) => [resource._id.toString(), resource]));

		res.json({
			requests: requests.map((request) => {
				const resource = request.resourceRef || resourceMap.get(request.resource?.toString()) || null;
				return {
					...formatRequest(request),
					resourceId: request.resource?.toString ? request.resource.toString() : request.resource,
					resource: resource?.name || request.resource || "Resource",
					resourceName: resource?.name || request.resource || "Resource",
				};
			})
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load your requests.", error: error.message });
	}
}

async function getAllRequests(req, res) {
	try {
		const { status, campus, priority } = req.query;
		const filter = {};

		if (status) filter.status = status;
		if (campus) filter.campus = campus;
		if (priority) filter.priority = priority;

		const requests = await Request.find(filter)
			.populate("resourceRef", "name category")
			.populate("student", "name email campus grade studentId avatar")
			.sort({ priority: -1, createdAt: -1 });

		const resourceIds = [...new Set(requests.map((request) => request.resource?.toString()).filter(Boolean))];
		const resources = await Resource.find({ _id: { $in: resourceIds } }).lean();
		const resourceMap = new Map(resources.map((resource) => [resource._id.toString(), resource]));

		res.json({
			requests: requests.map((request) => {
				const resource = request.resourceRef || resourceMap.get(request.resource?.toString()) || null;
				return {
					...formatRequest(request),
					resourceId: request.resource?.toString ? request.resource.toString() : request.resource,
					resource: resource?.name || request.resource || "Resource",
					resourceName: resource?.name || request.resource || "Resource",
				};
			})
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load requests.", error: error.message });
	}
}

async function getRequestById(req, res) {
	try {
		const request = await Request.findById(req.params.id)
			.populate("resourceRef", "name category")
			.populate("student", "name email campus grade studentId avatar")
			.populate("checkedBy", "name")
			.populate("approvedBy", "name")
			.populate("rejectedBy", "name");

		if (!request) {
			return res.status(404).json({ message: "Request not found." });
		}

		const resource = request.resourceRef || (request.resource ? await Resource.findById(request.resource).lean() : null);
		res.json({
			request: {
				...formatRequest(request),
				resourceId: request.resource?.toString ? request.resource.toString() : request.resource,
				resource: resource?.name || request.resource || "Resource",
				resourceName: resource?.name || request.resource || "Resource",
			}
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load request.", error: error.message });
	}
}

async function getRequestsByStatus(req, res) {
	try {
		const { status } = req.params;
		
		const validStatuses = ["pending", "approved", "rejected", "ready_for_claim", "claimed", "released", "completed"];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: "Invalid status." });
		}

		const requests = await Request.find({ status })
			.populate("resourceRef", "name category")
			.populate("student", "name email campus studentId avatar")
			.sort({ createdAt: -1 });

		const resourceIds = [...new Set(requests.map((request) => request.resource?.toString()).filter(Boolean))];
		const resources = await Resource.find({ _id: { $in: resourceIds } }).lean();
		const resourceMap = new Map(resources.map((resource) => [resource._id.toString(), resource]));

		res.json({ 
			status,
			count: requests.length,
			requests: requests.map((request) => {
				const resource = request.resourceRef || resourceMap.get(request.resource?.toString()) || null;
				return {
					...formatRequest(request),
					resourceId: request.resource?.toString ? request.resource.toString() : request.resource,
					resource: resource?.name || request.resource || "Resource",
					resourceName: resource?.name || request.resource || "Resource",
				};
			})
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to load requests.", error: error.message });
	}
}

module.exports = {
	// Create
	createRequest,
	verifyEligibility,
	approveRequest,
	rejectRequest,
	
	// Retrieve
	getMyRequests,
	getAllRequests,
	getRequestById,
	getRequestsByStatus,
};
