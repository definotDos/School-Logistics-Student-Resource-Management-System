const mongoose = require("mongoose");
const Request = require("../models/Request");
const Allocation = require("../models/Allocation");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const Resource = require("../models/Resource");
const Inventory = require("../models/Inventory");

const requestTransitions = {
	pending: ["approved", "rejected"],
	approved: ["ready_for_claim"],
	ready_for_claim: ["claimed"],
	claimed: ["completed"],
	released: ["completed"],
	completed: [],
	rejected: [],
};

const statusAliases = {
	Pending: "pending",
	Approved: "approved",
	Rejected: "rejected",
	"Ready for Claim": "ready_for_claim",
	Claimed: "claimed",
	Released: "released",
	Completed: "completed",
};

const getLegacyResourceIds = (requests) => [...new Set(
	requests
		.map((request) => request.resource?.toString())
		.filter((resourceId) => resourceId && mongoose.Types.ObjectId.isValid(resourceId))
)];

const getRequestResourceId = (request) => request.resourceRef?._id?.toString()
	|| (request.resource && mongoose.Types.ObjectId.isValid(request.resource.toString()) ? request.resource.toString() : "");

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatRequest = (request) => ({
	...request.toObject ? request.toObject() : request,
	id: `REQ-${request._id.toString().slice(-8).toUpperCase()}`,
	databaseId: request._id.toString(),
	resourceId: getRequestResourceId(request),
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
			$or: [{ resourceRef: resourceExists._id }, { resource: resourceExists.name }],
			status: { $in: ["pending", "approved", "ready_for_claim"] }
		});

		if (duplicate) {
			return res.status(400).json({ message: "You already have an active request for this resource." });
		}

		// Create request with initial status
		const request = await Request.create({
			student: req.user._id,
			resource: resourceExists.name,
			resourceRef: resourceExists._id,
			quantity: Number(quantity),
			category: category?.trim() || "Other",
			campus: req.user.campus,
			status: "Pending",
			eligibilityStatus: "Pending",
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
			"Pending",
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
			"Eligibility Verified",
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

		// Resolve the canonical resource reference first. Legacy requests may only
		// contain the resource name in the old `resource` field.
		const resource = request.resourceRef
			? await Resource.findById(request.resourceRef)
			: (mongoose.Types.ObjectId.isValid(request.resource)
				? await Resource.findById(request.resource)
				: await Resource.findOne({ name: request.resource }));
		if (!resource) {
			return res.status(409).json({ message: "This resource is no longer in the catalog." });
		}
		const existingAllocation = await Allocation.findOne({ request: request._id });
		if (existingAllocation) return res.status(409).json({ message: "This request already has an allocation." });

		// Reserve only while the requested stock is still available. The predicate
		// makes concurrent approvals fail instead of allowing negative stock.
		const inventory = await Inventory.findOneAndUpdate(
			{ resource: resource._id, available: { $gte: request.quantity } },
			{ $inc: { available: -request.quantity, reserved: request.quantity } },
			{ new: true }
		);
		if (!inventory) return res.status(409).json({ message: "Insufficient available stock for this request." });

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
			"Request Approved",
			"Request",
			request._id,
			previousStatus,
			"Approved",
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
		const requestId = req.params.id || req.body.requestId || req.body.id;
		const rejectionReason = req.body.rejectionReason || req.body.reason;

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
			"Request Rejected",
			"Request",
			request._id,
			previousStatus,
			"Rejected",
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

async function updateRequestStatus(req, res) {
	try {
		const requestId = req.params.id || req.body.requestId || req.body.id;
		const { status: requestedStatus, reason } = req.body;
		const status = statusAliases[requestedStatus] || requestedStatus;
		const validStatuses = Object.values(statusAliases);

		if (!requestId) {
			return res.status(400).json({ message: "Request ID is required." });
		}

		if (!status || !validStatuses.includes(status)) {
			return res.status(400).json({ message: "A valid request status is required." });
		}

		const request = await Request.findById(requestId);
		if (!request) {
			return res.status(404).json({ message: "Request not found." });
		}
		if (request.status !== status && !requestTransitions[request.status]?.includes(status)) {
			return res.status(409).json({ message: `Cannot change a ${request.status} request to ${status}.` });
		}

		const previousStatus = request.status;
		request.status = status;
		if (reason?.trim()) {
			request.reason = reason.trim();
		}
		if (status === "rejected" && reason?.trim()) {
			request.rejectionReason = reason.trim();
			request.rejectedBy = req.user._id;
			request.rejectedAt = new Date();
		}
		if (status === "approved") {
			request.approvedBy = req.user._id;
			request.approvedAt = request.approvedAt || new Date();
			request.eligibilityStatus = request.eligibilityStatus || "eligible";
		}
		if (status === "claimed") {
			request.claimedAt = request.claimedAt || new Date();
			request.claimedBy = request.claimedBy || (req.user?.name || "Student");
		}
		if (status === "released") {
			request.releasedAt = request.releasedAt || new Date();
			request.releasedBy = request.releasedBy || req.user._id;
		}
		if (status === "completed") {
			request.releasedAt = request.releasedAt || new Date();
			request.releasedBy = request.releasedBy || req.user._id;
			request.claimedAt = request.claimedAt || new Date();
			request.claimedBy = request.claimedBy || (req.user?.name || "Student");
		}

		await request.save();
		await createAuditLog(
			req.user._id,
			"Request Status Updated",
			"Request",
			request._id,
			previousStatus,
			status,
			`Status updated by ${req.user.name}${reason ? `: ${reason}` : ""}`
		);

		await request.populate("student", "name email studentId avatar");
		res.json({
			message: "Request status updated successfully.",
			request: formatRequest(request),
		});
	} catch (error) {
		res.status(500).json({ message: "Unable to update request status.", error: error.message });
	}
}

async function cancelRequest(req, res) {
	try {
		const request = await Request.findOne({ _id: req.params.id, student: req.user._id });
		if (!request) return res.status(404).json({ message: "Request not found." });
		if (request.status !== "Pending") return res.status(409).json({ message: "Only pending requests can be cancelled." });
		request.status = "Cancelled";
		request.cancelledBy = req.user._id;
		request.cancelledAt = new Date();
		await request.save();
		await createAuditLog(req.user._id, "Request Cancelled", "Request", request._id, "Pending", "Cancelled", "Cancelled by student.");
		res.json({ message: "Request cancelled.", request: formatRequest(request) });
	} catch (error) {
		res.status(500).json({ message: "Unable to cancel request.", error: error.message });
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

		const resourceIds = getLegacyResourceIds(requests);
		const resources = await Resource.find({ _id: { $in: resourceIds } }).lean();
		const resourceMap = new Map(resources.map((resource) => [resource._id.toString(), resource]));

		res.json({
			requests: requests.map((request) => {
				const resource = request.resourceRef || resourceMap.get(request.resource?.toString()) || null;
				return {
					...formatRequest(request),
					resourceId: getRequestResourceId(request),
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

		const resourceIds = getLegacyResourceIds(requests);
		const resources = await Resource.find({ _id: { $in: resourceIds } }).lean();
		const resourceMap = new Map(resources.map((resource) => [resource._id.toString(), resource]));

		res.json({
			requests: requests.map((request) => {
				const resource = request.resourceRef || resourceMap.get(request.resource?.toString()) || null;
				return {
					...formatRequest(request),
					resourceId: getRequestResourceId(request),
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
		if (req.user.role === "student" && request.student._id.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "You can only view your own requests." });
		}

		const resource = request.resourceRef || (request.resource && mongoose.Types.ObjectId.isValid(request.resource.toString())
			? await Resource.findById(request.resource).lean()
			: null);
		res.json({
			request: {
				...formatRequest(request),
				resourceId: getRequestResourceId(request),
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
		
		const validStatuses = ["Pending", "Approved", "Rejected", "Ready for Claim", "Claimed", "Released", "Completed"];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: "Invalid status." });
		}

		const requests = await Request.find({ status })
			.populate("resourceRef", "name category")
			.populate("student", "name email campus studentId avatar")
			.sort({ createdAt: -1 });

		const resourceIds = getLegacyResourceIds(requests);
		const resources = await Resource.find({ _id: { $in: resourceIds } }).lean();
		const resourceMap = new Map(resources.map((resource) => [resource._id.toString(), resource]));

		res.json({ 
			status,
			count: requests.length,
			requests: requests.map((request) => {
				const resource = request.resourceRef || resourceMap.get(request.resource?.toString()) || null;
				return {
					...formatRequest(request),
					resourceId: getRequestResourceId(request),
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
	cancelRequest,
	verifyEligibility,
	approveRequest,
	rejectRequest,
	updateRequestStatus,
	
	// Retrieve
	getMyRequests,
	getAllRequests,
	getRequestById,
	getRequestsByStatus,
};
