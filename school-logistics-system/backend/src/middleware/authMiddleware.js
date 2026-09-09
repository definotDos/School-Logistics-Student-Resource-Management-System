const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
	try {
		const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
		if (!token) return res.status(401).json({ message: "Authentication required." });
		const decoded = jwt.verify(token, process.env.JWT_SECRET || "development_secret");
		req.user = await User.findById(decoded.id);
		if (!req.user) return res.status(401).json({ message: "User account was not found." });
		if (String(req.user.status).toLowerCase() === "suspended") return res.status(403).json({ message: "This account has been suspended. Contact an administrator." });
		if (req.user.emailVerified === false) return res.status(403).json({ message: "Please verify your email." });
		next();
	} catch (error) {
		if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError", "CastError"].includes(error.name)) {
			return res.status(401).json({ message: "Invalid or expired authentication token." });
		}
		res.status(503).json({ message: "Unable to verify your session. Please try again shortly." });
	}
}

module.exports = protect;
