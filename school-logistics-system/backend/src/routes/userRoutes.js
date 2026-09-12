const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { getMe, getAllUsers, updateUserStatus, deleteUser, updateMe, createUser } = require("../controllers/userController");

const router = express.Router();
router.use(protect);
for (const param of ["id", "resourceId", "allocationId"]) router.param(param, (req, res, next, value) => {
	if (!/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ message: "Invalid record ID." });
	next();
});
router.get("/", allowRoles("admin", "staff"), getAllUsers);
router.post("/", allowRoles("admin"), require("../middleware/accountCreationReady"), createUser);
router.patch("/:id/student-id", allowRoles("admin"), require("../controllers/studentIdController"));
router.get("/all", allowRoles("admin"), getAllUsers);
router.patch("/:id/status", allowRoles("admin"), updateUserStatus);
router.delete("/:id", allowRoles("admin"), deleteUser);
router.get("/me", getMe);
router.patch("/me", updateMe);
router.post("/me/email-change", require("../controllers/emailChangeController").requestEmailChange);
router.post("/me/email-change/verify", require("../controllers/emailChangeController").confirmEmailChange);

module.exports = router;
