// Preview by default; pass --apply to persist recognized status corrections.
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const { normalizeStatus } = require("../src/utils/status");
const models = [require("../src/models/Request"), require("../src/models/User"), require("../src/models/Distribution")];

async function main() {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/school_logistics", { serverSelectionTimeoutMS: 5000 });
  for (const model of models) {
    const allowed = model.schema.path("status").enumValues;
    const groups = await model.collection.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray();
    let changed = 0;
    let unknown = 0;
    for (const group of groups) {
      const canonical = allowed.find(value => normalizeStatus(value) === normalizeStatus(group._id));
      if (!canonical) { unknown += group.count; continue; }
      if (canonical === group._id) continue;
      if (apply) {
        const result = await model.collection.updateMany({ status: group._id }, { $set: { status: canonical } });
        changed += result.modifiedCount;
      } else changed += group.count;
    }
    console.log(`${model.modelName}: ${changed} ${apply ? "corrected" : "would change"}; ${unknown} unrecognized (left unchanged).`);
  }
}
main().catch(() => {
  console.error("Status cleanup failed. Check database connectivity and permissions; no credentials are printed.");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
