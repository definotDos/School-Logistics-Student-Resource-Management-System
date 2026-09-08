const router = require("express").Router();
const protect = require("../middleware/authMiddleware");
const { campusFilter } = require("../middleware/campusScope");
const Request = require("../models/Request");
const Resource = require("../models/Resource");
const User = require("../models/User");
const Inventory = require("../models/Inventory");

router.use(protect);
for (const param of ["id", "resourceId", "allocationId"]) router.param(param, (req, res, next, value) => {
	if (!/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ message: "Invalid record ID." });
	next();
});
router.get("/", async (req, res) => {
	const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
	if (query.length < 2) return res.json({ results: [] });
	const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
	const scope = campusFilter(req);
	const student = req.user.role === "student";
	const users = student ? [] : await User.find({ ...scope, $or: [{ name: pattern }, { email: pattern }, { studentId: pattern }] }).select("name studentId role").limit(20).lean();
	const [resources, requests] = await Promise.all([
		Resource.find({ ...scope, $or: [{ name: pattern }, { category: pattern }, { description: pattern }] }).limit(20).lean(),
		Request.find({ ...scope, ...(student ? { student: req.user._id } : {}), $or: [{ resource: pattern }, { status: pattern }, ...(!student ? [{ student: { $in: users.map(u => u._id) } }] : [])] }).limit(20).lean(),
	]);
	const stock = student ? [] : await Inventory.find({ resource: { $in: resources.map(r => r._id) } }).lean();
	const results = [
		...users.map(u => ({ id: u._id, type: "User", title: u.name, detail: `${u.role} ${u.studentId || ""}`, url: req.user.role === "admin" ? "/admin/users" : "/staff/student_history" })),
		...requests.map(r => ({ id: r._id, type: "Request", title: `REQ-${String(r._id).slice(-8).toUpperCase()} · ${r.resource}`, detail: r.status, url: student ? "/requests" : req.user.role === "admin" ? "/admin/requests" : "/staff/review_requests" })),
		...resources.map(r => ({ id: r._id, type: "Resource", title: r.name, detail: r.category, url: student ? "/resources" : req.user.role === "admin" ? "/admin/catalog" : "/staff/review_requests" })),
		...stock.map(i => ({ id: i._id, type: "Inventory", title: resources.find(r => String(r._id) === String(i.resource))?.name, detail: `${i.available} available · ${i.reserved} reserved`, url: req.user.role === "admin" ? "/admin/inventory" : "/staff/reports" })),
	];
	res.json({ results });
});
module.exports = router;
