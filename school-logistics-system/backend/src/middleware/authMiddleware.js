const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
	try {
		const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
		if (!token) return res.status(401).json({ message: "Authentication required." });
		const decoded = jwt.verify(token, process.env.JWT_SECRET || "development_secret");
		req.user = await User.findById(decoded.id);
		if (!req.user) return res.status(401).json({ message: "User account was not found." });
		next();
	} catch {
		res.status(401).json({ message: "Invalid or expired authentication token." });
	}
}

module.exports = protect;
