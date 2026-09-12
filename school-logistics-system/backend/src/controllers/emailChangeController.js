const crypto = require("crypto");
const User = require("../models/User");
const { sendVerificationEmail } = require("../config/email");
const { publicUser } = require("./authController");
const hash = code => crypto.createHash("sha256").update(code).digest("hex");

async function requestEmailChange(req, res) {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || email === req.user.email) return res.status(400).json({ message: "Enter a different, valid email address." });
    if (await User.exists({ email })) return res.status(409).json({ message: "That email address is already in use." });
    const code = crypto.randomBytes(16).toString("hex");
    await sendVerificationEmail(email, code);
    await User.findByIdAndUpdate(req.user._id, { pendingEmail: email, emailChangeHash: hash(code), emailChangeExpiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    res.json({ message: "Code sent to your new email. Your current email stays active until verification." });
  } catch {
    res.status(503).json({ message: "Unable to send verification email. Please try again." });
  }
}

async function confirmEmailChange(req, res) {
  try {
    const { email, code } = req.body;
    if (typeof email !== "string" || typeof code !== "string" || !/^[a-f0-9]{32}$/.test(code)) return res.status(400).json({ message: "Enter the full verification code sent to your new email." });
    const user = await User.findOneAndUpdate({ _id: req.user._id, pendingEmail: email.trim().toLowerCase(), emailChangeHash: hash(code), emailChangeExpiresAt: { $gt: new Date() } }, {
      $set: { email: email.trim().toLowerCase(), emailVerified: true },
      $unset: { pendingEmail: 1, emailChangeHash: 1, emailChangeExpiresAt: 1, passwordResetHash: 1, passwordResetExpiresAt: 1 },
    }, { new: true, runValidators: true });
    if (!user) return res.status(400).json({ message: "Code invalid or expired. Request a new code and try again." });
    res.json({ user: publicUser(user), message: "Email changed and verified." });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? "That email address is already in use." : "Unable to verify email." });
  }
}

module.exports = { requestEmailChange, confirmEmailChange };
