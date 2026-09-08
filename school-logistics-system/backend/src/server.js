const app = require("./app");
const connectDB = require("./config/database");
const Resource = require("./models/Resource");

// Server
const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  // Campus records are imported from existing database locations, never a mock catalog.
  const Campus = require("./models/Campus");
  const names = new Set([...(await require("./models/User").distinct("campus")), ...(await Resource.distinct("campus"))]);
  for (const name of names) {
    if (name?.trim()) await Campus.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => { console.error("Server startup failed:", error.message); process.exitCode = 1; });
