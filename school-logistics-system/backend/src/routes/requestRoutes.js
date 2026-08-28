const express = require("express");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { createRequest, getMyRequests, getAllRequests, updateRequestStatus } = require("../controllers/requestController");

const router = express.Router();
router.use(protect);
router.get("/my", allowRoles("student"), getMyRequests);
router.post("/", allowRoles("student"), createRequest);
router.get("/all", allowRoles("admin", "staff"), getAllRequests);
router.patch("/:id", allowRoles("admin", "staff"), updateRequestStatus);

module.exports = router;
