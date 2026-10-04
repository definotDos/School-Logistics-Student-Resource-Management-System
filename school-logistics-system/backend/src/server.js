const app = require("./app");
const connectDB = require("./config/database");
const Resource = require("./models/Resource");

// Server
const PORT = process.env.PORT || 5000;

async function startServer() {
  const emailProvider = (process.env.EMAIL_PROVIDER || 'mailtrap').trim().toLowerCase();
  console.info(JSON.stringify({ event: 'deployment_configuration',
    revision: process.env.RENDER_GIT_COMMIT || 'local',
    emailTransport: emailProvider === 'resend' ? 'resend_https' : 'smtp' }));
  const { signingKey } = require('./utils/session');
  signingKey();
  require('./services/loginFactor').secret();
  if (!process.env.AUTH_AUDIT_SECRET || Buffer.byteLength(process.env.AUTH_AUDIT_SECRET) < 32) throw new Error('AUTH_AUDIT_SECRET must contain at least 32 bytes');
  await connectDB();
  await require('./utils/removeLegacyAuthenticator')(require('./models/User'));
  // Existing users must still be able to sign in and correct legacy ID conflicts.
  app.locals.accountCreationReady = false;
  try {
    await require("./utils/studentIds").prepareStudentIds(require("./models/User"));
    app.locals.accountCreationReady = true;
  } catch (error) {
    console.error("Account creation paused:", error.message);
  }
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

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  if (/JWT_SECRET/.test(error.message)) console.error('For local setup, run npm run auth:setup, then restart the backend.');
  process.exitCode = 1;
});
