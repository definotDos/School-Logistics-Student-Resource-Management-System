const User = require("../models/User");
const { canAccessCampus } = require("../middleware/campusScope");
const { prepareStudentIds } = require("../utils/studentIds");
const { publicUser } = require("./authController");

// Serialize administrator corrections while the legacy database has no unique index.
let correction = Promise.resolve();
module.exports = (req, res) => {
  const task = correction.then(async () => {
    try {
      const studentId = typeof req.body.studentId === "string" ? req.body.studentId.trim().toUpperCase() : "";
      if (!studentId || studentId.length > 100) return res.status(400).json({ message: "Enter a student ID of 1 to 100 characters from the school roster." });
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "Account not found." });
      if (!canAccessCampus(req, user)) return res.status(403).json({ message: "User belongs to another campus." });
      if (user.role !== "student") return res.status(400).json({ message: "Only student accounts can have their student ID corrected here." });
      const existing = await User.find({ studentId: { $type: "string" }, _id: { $ne: user._id } }).select("studentId").lean();
      if (existing.some(item => item.studentId.trim().toUpperCase() === studentId)) return res.status(409).json({ message: "That student ID is already registered." });
      user.studentId = studentId;
      await user.save();
      if (req.app.locals.accountCreationReady === false) {
        try {
          await prepareStudentIds(User);
          req.app.locals.accountCreationReady = true;
        } catch (error) { console.error("Account creation remains paused:", error.message); }
      }
      res.json({ user: publicUser(user), accountCreationReady: req.app.locals.accountCreationReady !== false });
    } catch (error) {
      res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? "That student ID is already registered." : "Unable to correct student ID." });
    }
  });
  correction = task.catch(() => {});
  return task;
};
