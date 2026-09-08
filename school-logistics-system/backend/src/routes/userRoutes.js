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
router.post("/", allowRoles("admin"), createUser);
router.get("/all", allowRoles("admin"), getAllUsers);
router.patch("/:id/status", allowRoles("admin"), updateUserStatus);
router.delete("/:id", allowRoles("admin"), deleteUser);
router.get("/me", getMe);
router.patch("/me", updateMe);

module.exports = router;
