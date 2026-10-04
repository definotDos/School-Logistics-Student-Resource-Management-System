const crypto = require('crypto');
const Device = require('../models/TrustedDevice');
const { hash } = require('./loginFactor');
const cookieName = '__Host-srms-device';
const options = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' };
const fingerprint = req => hash(`${req.ip || ''}\n${req.get('user-agent') || ''}`);
function token(req) {
  const value = (req.headers?.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}
async function validate(req, user) {
  const value = token(req);
  if (!value) return false;
  const device = await Device.findOne({ tokenHash: hash(value), user: user._id, revokedAt: null,
    sessionVersion: user.sessionVersion || 0, emailHash: hash(user.email), expiresAt: { $gt: new Date() } }).select('+fingerprint');
  if (!device) return false;
  if (device.fingerprint !== fingerprint(req)) {
    await Device.updateOne({ _id: device._id }, { $set: { revokedAt: new Date() } });
    return false;
  }
  return true;
}
async function remember(req, res, user) {
  const value = crypto.randomBytes(32).toString('hex');
  const maxAge = 30 * 24 * 60 * 60 * 1000;
  await Device.create({ user: user._id, tokenHash: hash(value), fingerprint: fingerprint(req),
    sessionVersion: user.sessionVersion || 0, emailHash: hash(user.email), expiresAt: new Date(Date.now() + maxAge) });
  res.cookie(cookieName, value, { ...options, maxAge });
}
module.exports = { validate, remember, clear: res => res.clearCookie(cookieName, options) };
