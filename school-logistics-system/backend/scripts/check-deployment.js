// Read-only preflight. Never print environment values or send email.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), quiet: true });
const env = process.env;
let failures = 0;
function check(ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`);
  if (!ok) failures++;
}
console.log('Production configuration check for this process (local results do not verify Render settings).');
check(env.NODE_ENV === 'production', 'NODE_ENV must be production on Render');
check(/^mongodb(?:\+srv)?:\/\//.test(env.MONGODB_URI || env.MONGO_URI || ''), 'MongoDB connection string is configured');
for (const key of ['JWT_SECRET', 'OTP_SECRET', 'AUTH_AUDIT_SECRET']) {
  check(Buffer.byteLength(env[key] || '') >= 32, `${key} contains at least 32 bytes`);
}
check(new Set([env.JWT_SECRET, env.OTP_SECRET, env.AUTH_AUDIT_SECRET]).size === 3, 'Authentication secrets are distinct');
let originValid = false;
try { const url = new URL(env.FRONTEND_ORIGIN); originValid = url.protocol === 'https:' && url.origin === env.FRONTEND_ORIGIN; } catch {}
check(originValid, 'FRONTEND_ORIGIN is an exact HTTPS origin without a trailing slash');
check(env.TRUST_PROXY_HOPS === '1', 'TRUST_PROXY_HOPS is 1 for the documented Render setup');
const provider = (env.EMAIL_PROVIDER || '').trim().toLowerCase();
check(['resend', 'gmail', 'smtp', 'mailtrap'].includes(provider), 'EMAIL_PROVIDER is explicitly configured');
check(Boolean(env.EMAIL_FROM?.trim()), 'EMAIL_FROM is configured');
if (provider === 'resend') {
  check(Boolean(env.RESEND_API_KEY?.trim()), 'RESEND_API_KEY is configured');
  console.log('NOTE Verify the sending domain and key permissions in Resend; this check does not validate delivery.');
} else {
  check(Boolean(env.SMTP_USER?.trim() && env.SMTP_PASS?.trim()), 'SMTP credentials are configured');
  const port = Number(env.SMTP_PORT || (provider === 'gmail' ? 587 : 2525));
  if ([25, 465, 587].includes(port)) console.log('WARNING Render Free blocks this SMTP port. Use HTTPS email or hosting that permits SMTP.');
  if (provider === 'mailtrap' || /sandbox/i.test(env.SMTP_HOST || '')) console.log('WARNING Mailtrap sandbox does not deliver messages to student inboxes.');
}
console.log('No database connection or email was attempted. Complete a real login to verify delivery.');
process.exitCode = failures ? 1 : 0;
