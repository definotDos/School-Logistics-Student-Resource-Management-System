const mongoose = require("mongoose");

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27028/school_logistics_refactor_test?directConnection=true", { serverSelectionTimeoutMS: 5000 });
  const admin = mongoose.connection.db.admin();
  const hello = await admin.command({ hello: 1 });
  if (!hello.setName) await admin.command({ replSetInitiate: { _id: "slsTest", members: [{ _id: 0, host: "127.0.0.1:27028" }] } });
  console.log("Disposable test replica set initialized on port 27028.");
  await mongoose.disconnect();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
