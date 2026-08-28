const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const requestRoutes = require("./routes/requestRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const distributionRoutes = require("./routes/distributionRoutes");
const allocationRoutes = require("./routes/allocationRoutes");
const Resource = require("./models/Resource");
const Inventory = require("./models/Inventory");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/distribution", distributionRoutes);
app.use("/api/allocations", allocationRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "School Logistics API is running",
  });
});

// Server
const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  await ensureDefaultCatalog();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

async function ensureDefaultCatalog() {
  const defaults = [
    ["School Uniform", "Uniform", "Uniform set", 45, "Sizing required"],
    ["School Shoes", "Footwear", "Black leather school shoes", 28, "Size required"],
    ["Mathematics Book", "Books", "Mathematics learning book", 120, ""],
    ["Learning Modules", "Modules", "Learning module pack", 85, ""],
    ["Student ID", "Identification", "Official school identification card", 60, ""],
  ];
  for (const [name, category, description, quantity, sizingRule] of defaults) {
    const resource = await Resource.findOneAndUpdate({ name }, { $setOnInsert: { name, category, description, campus: "PHINMA University of Pangasinan", sizingRule, status: "Available" } }, { upsert: true, new: true });
    await Inventory.findOneAndUpdate({ resource: resource._id }, { $setOnInsert: { resource: resource._id, available: quantity } }, { upsert: true });
  }
}

startServer();