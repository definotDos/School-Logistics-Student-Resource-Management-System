const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const { setupAuth } = require('../scripts/setup-auth');
let directory, envPath;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'srms-auth-test-'));
  envPath = path.join(directory, '.env');
});
afterEach(() => { fs.unlinkSync(envPath); fs.rmdirSync(directory); });
test('repairs missing keys and a short JWT secret while preserving other settings', () => {
  fs.writeFileSync(envPath, 'JWT_SECRET=short\nMONGO_URI=mongodb://localhost/example\n');
  expect(setupAuth(envPath)).toEqual(['JWT_SECRET', 'OTP_SECRET', 'AUTH_AUDIT_SECRET']);
  const env = dotenv.parse(fs.readFileSync(envPath));
  expect(env.JWT_SECRET).toHaveLength(96);
  expect(env.MONGO_URI).toBe('mongodb://localhost/example');
  const original = fs.readFileSync(envPath, 'utf8');
  expect(setupAuth(envPath)).toEqual([]);
  expect(fs.readFileSync(envPath, 'utf8')).toBe(original);
});
test('preserves valid authentication keys', () => {
  const original = ['JWT_SECRET', 'OTP_SECRET', 'AUTH_AUDIT_SECRET'].map(name => name + '=' + 'a'.repeat(64)).join('\n') + '\n';
  fs.writeFileSync(envPath, original);
  expect(setupAuth(envPath)).toEqual([]);
  expect(fs.readFileSync(envPath, 'utf8')).toBe(original);
});
