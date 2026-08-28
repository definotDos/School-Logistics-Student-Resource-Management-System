const Allocation = require("../models/Allocation");

async function listAllocations(req, res) {
	try {
		const filter = req.user.role === "student" ? { student: req.user._id } : {};
		const allocations = await Allocation.find(filter).populate("student", "name email").populate("resource", "name category campus").populate("request", "status").sort({ createdAt: -1 });
		res.json({ allocations });
	} catch {
		res.status(500).json({ message: "Unable to load allocations." });
	}
}

module.exports = { listAllocations };
