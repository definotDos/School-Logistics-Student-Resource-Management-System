const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const requestRoutes = require("./routes/requestRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const distributionRoutes = require("./routes/distributionRoutes");
const allocationRoutes = require("./routes/allocationRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Load environment variables
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const app = express();

// Middleware
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000');
    if (!req.secure) return res.status(400).json({ message: 'HTTPS is required.' });
  }
  // Browser mutations must come from the configured frontend. API bearer clients may omit Origin.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.get('origin') && req.get('origin') !== frontendOrigin || req.get('sec-fetch-site') === 'cross-site')) {
    return res.status(403).json({ message: 'Untrusted request origin.' });
  }
  next();
});
app.use(express.json({ limit: "5mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/distribution", distributionRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/campuses", require("./routes/campusRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "School Logistics API is running",
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const invalid = error.name === "CastError" || error.name === "ValidationError" || error instanceof SyntaxError;
  res.status(invalid ? 400 : 500).json({ message: invalid ? "Invalid request data." : "Unable to process request." });
});
module.exports = app;
