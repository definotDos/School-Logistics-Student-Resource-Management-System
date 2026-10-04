const { verifyAudit } = require('../scripts/verify-auth-audit');
test('authentication audit detects modification, deletion and reordering', () => {
  jest.resetModules();
  const output = jest.spyOn(console, 'info').mockImplementation(() => {});
  const audit = require('../src/services/authAudit');
  audit({ event: 'authentication', path: '/login', status: 200 });
  audit({ event: 'authentication', path: '/mfa/verify', status: 400 });
  audit({ event: 'authentication', path: '/mfa/verify', status: 200 });
  const lines = output.mock.calls.map(call => call[0]);
  expect(verifyAudit(lines.join('\n'), process.env.AUTH_AUDIT_SECRET).count).toBe(3);
  expect(() => verifyAudit(lines.join('\n').replace('"status":400', '"status":200'), process.env.AUTH_AUDIT_SECRET)).toThrow();
  expect(() => verifyAudit([lines[0], lines[2]].join('\n'), process.env.AUTH_AUDIT_SECRET)).toThrow();
  expect(() => verifyAudit(lines.reverse().join('\n'), process.env.AUTH_AUDIT_SECRET)).toThrow();
  output.mockRestore();
});
