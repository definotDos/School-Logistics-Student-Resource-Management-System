const express = require("express");
const { signup, login, verifyEmail, resendVerificationCode, forgotPassword, resetPassword } = require("../controllers/authController");

const router = express.Router();
// Bound attempts per client, including code guessing and email requests.
const attempts = new Map();
router.use((req, res, next) => {
 const now = Date.now();
 for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
 const key = req.ip;
 const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
 entry.count += 1;
 attempts.set(key, entry);
 if (entry.count > 30) { res.set("Retry-After", String(Math.ceil((entry.until - now) / 1000))); return res.status(429).json({ message: "Too many attempts. Please try again in 15 minutes." }); }
 next();
});
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/signup", require("../middleware/accountCreationReady"), signup);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification-code", resendVerificationCode);

module.exports = router;
