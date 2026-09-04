const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { getNotifications, createNotification } = require("../controllers/notificationController");

const router = express.Router();
router.use(protect);

router.get("/", getNotifications);
router.post("/", allowRoles("staff", "admin"), createNotification);

module.exports = router;
