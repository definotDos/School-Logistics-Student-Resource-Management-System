const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Explicit local setup only. Never regenerate signing keys during server startup.
function setupAuth(envPath) {
  let contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const values = dotenv.parse(contents);
  const changed = [];
  const set = (name, value) => {
    const line = new RegExp(`^(?:export\\s+)?${name}\\s*=.*$`, 'gm');
    contents = contents.replace(line, '').trimEnd() + `\n${name}=${value}\n`;
    changed.push(name);
  };
  for (const name of ['JWT_SECRET', 'OTP_SECRET', 'AUTH_AUDIT_SECRET']) {
    if (!values[name] || Buffer.byteLength(values[name]) < 32) set(name, crypto.randomBytes(48).toString('hex'));
  }
  if (changed.length) fs.writeFileSync(envPath, contents, { mode: 0o600 });
  return changed;
}

if (require.main === module) {
  try {
    const changed = setupAuth(path.resolve(__dirname, '../.env'));
    console.log(changed.length ? `Authentication configuration saved: ${changed.join(', ')}. Restart the backend.` : 'Authentication configuration is ready. Existing keys were preserved.');
    if (changed.includes('JWT_SECRET')) console.log('Existing sessions must sign in again.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { setupAuth };
