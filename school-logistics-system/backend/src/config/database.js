const mongoose = require("mongoose");
const dns = require("node:dns");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/school_logistics";
    // Optional resolver override for networks that refuse Atlas SRV lookups.
    // This affects only this Node process, not Windows network settings.
    if (mongoUri.startsWith("mongodb+srv://") && process.env.MONGO_DNS_SERVERS?.trim()) {
      dns.setServers(process.env.MONGO_DNS_SERVERS.split(",").map(server => server.trim()).filter(Boolean));
    }
    const connection = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

    console.log(
      `MongoDB Connected: ${connection.connection.host}`
    );
    return connection;
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);

    throw error;
  }
};

module.exports = connectDB;
