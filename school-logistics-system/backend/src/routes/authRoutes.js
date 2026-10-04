const express = require("express");
const { signup, login, verifyEmail, resendVerificationCode, forgotPassword, resetPassword } = require("../controllers/authController");

const router = express.Router();
router.use((req, res, next) => {
 res.set('Cache-Control', 'no-store');
 res.on('finish', () => {
  // Structured security events: never include request bodies, passwords, tokens, codes, or secrets.
  require('../services/authAudit')({ event: 'authentication', path: req.route?.path || 'unknown', method: req.method,
   status: res.statusCode, outcome: res.statusCode < 400 ? 'success' : 'failure',
   userId: req.authAuditUser || (req.user ? String(req.user._id) : undefined), ip: req.ip, time: new Date().toISOString() });
 });
 next();
});
router.use((req, res, next) => {
 if (["POST", "PATCH", "PUT"].includes(req.method) && (!req.body || typeof req.body !== "object" || Array.isArray(req.body))) return res.status(400).json({ message: "Provide a JSON object." });
 next();
});
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
router.post("/check-employee-id", require("../controllers/authController").checkEmployeeId);
router.post("/login", login);
const mfa = require('../controllers/mfaController');
const protect = require('../middleware/authMiddleware');
router.post('/mfa/verify', mfa.verify);
router.post('/mfa/resend', mfa.resend);
router.get('/devices', protect, mfa.listDevices);
router.delete('/devices', protect, mfa.revokeDevices);
router.post('/logout', protect, mfa.logout);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification-code", resendVerificationCode);
module.exports = router;
