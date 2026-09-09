const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../src/models/User");
const Campus = require("../../src/models/Campus");
const Resource = require("../../src/models/Resource");
const Inventory = require("../../src/models/Inventory");

async function connectTestDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !new URL(uri).pathname.endsWith("_test")) throw new Error("Set MONGODB_URI to an explicit disposable database ending in _test.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName) throw new Error("Integration tests require a MongoDB replica set.");
  for (const model of Object.values(mongoose.models)) await model.init();
}

async function fixtures() {
  const suffix = new mongoose.Types.ObjectId().toString();
  const campus = `Campus-${suffix}`;
  const otherCampus = `Other-${suffix}`;
  await Campus.create([{ name: campus }, { name: otherCampus }]);
  const users = {};
  const tokens = {};
  for (const [key, role, assigned] of [["student", "student", campus], ["peer", "student", campus], ["staff", "staff", campus], ["otherStaff", "staff", otherCampus], ["admin", "admin", campus]]) {
    users[key] = await User.create({ name: key, email: `${key}-${suffix}@example.test`, studentId: `${key}-${suffix}`, password: await bcrypt.hash("TestPassword123", 4), role, campus: assigned, emailVerified: true });
    tokens[key] = jwt.sign({ id: users[key]._id }, process.env.JWT_SECRET);
  }
  const resource = await Resource.create({ name: `Book-${suffix}`, campus, category: "Books", maxQuantityPerStudent: 10 });
  await Inventory.create({ resource: resource._id, available: 10 });
  return { campus, otherCampus, users, tokens, resource };
}

module.exports = { connectTestDatabase, fixtures };
