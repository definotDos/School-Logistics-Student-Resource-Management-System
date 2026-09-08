const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { getNotifications, createNotification, markRead } = require("../controllers/notificationController");

const router = express.Router();
router.use(protect);
for (const param of ["id", "resourceId", "allocationId"]) router.param(param, (req, res, next, value) => {
	if (!/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ message: "Invalid record ID." });
	next();
});

router.get("/", getNotifications);
router.patch("/:id/read", markRead);
router.post("/", allowRoles("staff", "admin"), createNotification);

module.exports = router;
