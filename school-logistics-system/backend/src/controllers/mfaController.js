const User = require('../models/User');
const crypto = require('crypto');
const Device = require('../models/TrustedDevice');
const factor = require('../services/loginFactor');
const devices = require('../services/trustedDevices');
const { authorized, createSessionToken } = require('../utils/session');
const { publicUser } = require('./authController');
const invalid = () => factor.failure('Code is incorrect, expired, used, replaced, or its attempt limit was reached. Request a new code or sign in again.');
const handle = fn => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    res.status(error.status || 503).json({ message: error.status ? error.message : 'Authentication is temporarily unavailable.' });
  }
};
exports.verify = handle(async (req, res) => {
  const { challenge, code, rememberDevice } = req.body;
  if (!factor.validChallenge(challenge) || typeof code !== 'string' || !/^\d{6}$/.test(code) ||
      (rememberDevice !== undefined && typeof rememberDevice !== 'boolean')) throw factor.failure('Enter a six-digit code and a valid sign-in challenge.');
  // Reserve each attempt atomically, including concurrent requests with the right code.
  const filter = { 'loginFactor.challengeHash': factor.hash(challenge), 'loginFactor.used': false,
    'loginFactor.ready': true, 'loginFactor.expiresAt': { $gt: new Date() }, 'loginFactor.attempts': { $lt: 5 } };
  const user = await User.findOneAndUpdate(filter, { $inc: { 'loginFactor.attempts': 1 } }, { new: true }).select('+loginFactor');
  if (!user) throw invalid();
  req.authAuditUser = String(user._id);
  const pending = user.loginFactor;
  if (!authorized(user) || pending.sessionVersion !== (user.sessionVersion || 0) || pending.email !== user.email) throw invalid();
  if (!pending.codeHash || !crypto.timingSafeEqual(Buffer.from(pending.codeHash, 'hex'), Buffer.from(factor.codeHash(challenge, code), 'hex'))) throw invalid();
  // A single conditional consume prevents replay and prevents a racing resend being verified.
  const consumed = await User.findOneAndUpdate({ _id: user._id,
    'loginFactor.challengeHash': factor.hash(challenge), 'loginFactor.used': false,
    'loginFactor.expiresAt': { $gt: new Date() }, email: pending.email, status: 'active', emailVerified: true,
    $expr: { $eq: [{ $ifNull: ['$sessionVersion', 0] }, pending.sessionVersion] } },
  { $set: { 'loginFactor.used': true }, $unset: { 'loginFactor.codeHash': 1 } }, { new: true });
  if (!consumed || !authorized(consumed)) throw invalid();
  if (rememberDevice) await devices.remember(req, res, consumed);
  res.json({ user: publicUser(consumed), token: createSessionToken(consumed, pending.rememberMe, 'otp') });
});
exports.resend = handle(async (req, res) => {
  if (!factor.validChallenge(req.body.challenge)) throw invalid();
  const user = await User.findOne({ 'loginFactor.challengeHash': factor.hash(req.body.challenge), 'loginFactor.used': false }).select('+loginFactor');
  if (!authorized(user) || user.loginFactor.sessionVersion !== (user.sessionVersion || 0) || user.loginFactor.email !== user.email) throw invalid();
  if (+user.loginFactor.expiresAt < Date.now() - 10 * 60 * 1000) throw invalid();
  req.authAuditUser = String(user._id);
  res.json(await factor.issue(user, user.loginFactor.rememberMe, req.body.challenge));
});
exports.listDevices = handle(async (req, res) => {
  res.json({ devices: await Device.find({ user: req.user._id, revokedAt: null, expiresAt: { $gt: new Date() }, sessionVersion: req.user.sessionVersion || 0 }).select('_id createdAt expiresAt').lean() });
});
exports.revokeDevices = handle(async (req, res) => {
  await Device.updateMany({ user: req.user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  devices.clear(res);
  res.json({ message: 'All trusted devices revoked.' });
});
exports.logout = handle(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 }, $unset: { loginFactor: 1 } });
  devices.clear(res);
  res.json({ message: 'Signed out. All sessions and device trust have been revoked.' });
});
