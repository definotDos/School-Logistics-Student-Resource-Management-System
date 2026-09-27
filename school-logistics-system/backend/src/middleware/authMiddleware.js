const jwt = require("jsonwebtoken");
const { signingKey, authorized } = require("../utils/session");
const User = require("../models/User");

async function protect(req, res, next) {
	try {
		const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
		if (!token) return res.status(401).json({ message: "Authentication required." });
		const decoded = jwt.verify(token, signingKey(), { algorithms: ["HS256"], issuer: "school-logistics", audience: "school-logistics-api" });
		if (decoded.purpose !== "session" || !Array.isArray(decoded.amr) || !decoded.amr.includes("pwd") || !Number.isFinite(decoded.exp)) return res.status(401).json({ message: "Please log in to continue." });
		req.user = await User.findById(decoded.id);
		if (req.user && (decoded.sessionVersion || 0) !== (req.user.sessionVersion || 0)) return res.status(401).json({ message: "Your session has expired. Please log in again." });
		if (!req.user) return res.status(401).json({ message: "User account was not found." });
		if (String(req.user.status).toLowerCase() === "suspended") return res.status(403).json({ message: "This account has been suspended. Contact an administrator." });
		if (!authorized(req.user)) return res.status(403).json({ message: "Unable to authorize this account." });
		next();
	} catch (error) {
		if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError", "CastError"].includes(error.name)) {
			return res.status(401).json({ message: "Invalid or expired authentication token." });
		}
		res.status(503).json({ message: "Unable to verify your session. Please try again shortly." });
	}
}

module.exports = protect;
