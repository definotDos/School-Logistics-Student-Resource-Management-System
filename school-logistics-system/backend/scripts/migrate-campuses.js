// Idempotent migration of existing campus names and the resource uniqueness index.
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const Campus = require("../src/models/Campus");
const Resource = require("../src/models/Resource");
async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/school_logistics");
  const names = new Set();
  for (const model of ["User", "Resource", "Request", "Allocation", "ClaimSchedule", "Distribution"]) {
    for (const campus of await require(`../src/models/${model}`).distinct("campus")) if (campus?.trim()) names.add(campus);
  }
  if (!process.argv.includes("--apply")) {
    console.log(`${names.size} existing campus names can be imported. Resource uniqueness changes from name to campus + name. Pass --apply to migrate.`);
    return;
  }
  for (const name of names) await Campus.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  await Resource.collection.createIndex({ campus: 1, name: 1 }, { unique: true });
  const indexes = await Resource.collection.indexes();
  const oldIndex = indexes.find(index => index.unique && Object.keys(index.key).length === 1 && index.key.name === 1);
  if (oldIndex) await Resource.collection.dropIndex(oldIndex.name);
  console.log(`Imported ${names.size} existing campus names; resource uniqueness now uses campus + name. No records deleted.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
