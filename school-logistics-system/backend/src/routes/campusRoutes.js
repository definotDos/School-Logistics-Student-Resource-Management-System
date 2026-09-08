const router = require("express").Router();
const Campus = require("../models/Campus");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

// Public registration needs only the list of active campus names.
router.get("/public", async (req, res) => {
	res.json({ campuses: await Campus.find({ status: "active" }).select("name code").sort({ name: 1 }) });
});
router.use(protect);
for (const param of ["id", "resourceId", "allocationId"]) router.param(param, (req, res, next, value) => {
	if (!/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ message: "Invalid record ID." });
	next();
});
router.get("/", async (req, res) => {
	res.json({ campuses: await Campus.find(req.user.role === "admin" ? {} : { name: req.user.campus }).sort({ name: 1 }) });
});
router.use(allowRoles("admin"));
const fields = (body) => Object.fromEntries(Object.entries(body).filter(([key]) => ["name", "code", "address", "contact", "status"].includes(key)));
router.post("/", async (req, res) => {
	try {
		const campus = await Campus.create(fields(req.body));
		res.status(201).json({ campus });
	} catch (error) { res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "Campus already exists." : error.message }); }
});
router.patch("/:id", async (req, res) => {
	try {
		const campus = await Campus.findById(req.params.id);
		if (!campus) return res.status(404).json({ message: "Campus not found." });
		// Names are the existing foreign keys; retain them to preserve historical records.
		if (req.body.name !== undefined && req.body.name.trim() !== campus.name) return res.status(409).json({ message: "Campus names cannot change because existing records reference them. Edit contact details or deactivate the campus instead." });
		Object.assign(campus, fields(req.body));
		await campus.save();
		res.json({ campus });
	} catch (error) { res.status(400).json({ message: error.message }); }
});
router.delete("/:id", async (req, res) => {
	const campus = await Campus.findById(req.params.id);
	if (!campus) return res.status(404).json({ message: "Campus not found." });
	for (const name of ["User", "Resource", "Request", "Allocation", "ClaimSchedule", "Distribution"]) {
		if (await require(`../models/${name}`).exists({ campus: campus.name })) return res.status(409).json({ message: "This campus has linked records. Deactivate it instead." });
	}
	await campus.deleteOne();
	res.json({ message: "Campus deleted." });
});
module.exports = router;
