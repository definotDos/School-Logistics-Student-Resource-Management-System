const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { getMe, getAllUsers, updateUserStatus, deleteUser, updateMe } = require("../controllers/userController");

const router = express.Router();
router.use(protect);
router.get("/all", allowRoles("admin"), getAllUsers);
router.patch("/:id/status", allowRoles("admin"), updateUserStatus);
router.delete("/:id", allowRoles("admin"), deleteUser);
router.get("/me", getMe);
router.patch("/me", updateMe);

module.exports = router;
