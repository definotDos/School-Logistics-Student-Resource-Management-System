const express = require("express");
const { signup, login, verifyEmail, resendVerificationCode } = require("../controllers/authController");

const router = express.Router();
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification-code", resendVerificationCode);

module.exports = router;
