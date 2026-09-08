const REQUEST_STATUSES = ["pending", "approved", "rejected", "cancelled", "ready_for_claim", "claimed", "released", "completed"];
const USER_STATUSES = ["active", "suspended"];

function normalizeStatus(value) {
	return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : value;
}

module.exports = { REQUEST_STATUSES, USER_STATUSES, normalizeStatus };
