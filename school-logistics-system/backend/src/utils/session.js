const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function signingKey() {
  const key = process.env.JWT_SECRET;
  if (!key || Buffer.byteLength(key) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  return key;
}

const authorized = user => user && user.status === 'active' && user.emailVerified === true && ['student', 'staff', 'admin'].includes(user.role);

function createSessionToken(user, rememberMe) {
  return jwt.sign({ id: user._id, role: user.role, sessionVersion: user.sessionVersion || 0,
    amr: ['pwd'], purpose: 'session' }, signingKey(), {
    algorithm: 'HS256', issuer: 'school-logistics', audience: 'school-logistics-api',
    jwtid: crypto.randomUUID(), expiresIn: rememberMe === true ? '7d' : '8h',
  });
}

module.exports = { signingKey, authorized, createSessionToken };
