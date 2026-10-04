const crypto = require('crypto');
const User = require('../models/User');
const { sendLoginCode } = require('../config/email');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function secret() {
  const key = process.env.OTP_SECRET;
  if (!key || Buffer.byteLength(key) < 32) throw new Error('OTP_SECRET must contain at least 32 bytes');
  return key;
}
const codeHash = (challenge, code) => crypto.createHmac('sha256', secret()).update(`${challenge}:${code}`).digest('hex');
const failure = (message, status = 400) => Object.assign(new Error(message), { status });
const metadata = factor => ({ requiresMfa: true, expiresAt: factor.expiresAt, resendAt: factor.resendAt });

async function issue(user, rememberMe, previousChallenge) {
  const now = new Date();
  const challenge = crypto.randomBytes(32).toString('hex');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const factor = { challengeHash: hash(challenge), codeHash: codeHash(challenge, code),
    expiresAt: new Date(+now + 300000), resendAt: new Date(+now + 60000),
    attempts: 0, used: false, ready: false, sessionVersion: user.sessionVersion || 0,
    email: user.email, rememberMe: rememberMe === true };
  const filter = { _id: user._id, $expr: { $eq: [{ $ifNull: ['$sessionVersion', 0] }, user.sessionVersion || 0] },
    $or: [{ 'loginFactor.resendAt': { $lte: now } }, { 'loginFactor.resendAt': { $exists: false } }] };
  if (previousChallenge) { filter['loginFactor.challengeHash'] = hash(previousChallenge); filter['loginFactor.used'] = false; }
  if (!await User.findOneAndUpdate(filter, { $set: { loginFactor: factor } })) {
    throw failure('Please wait 60 seconds before requesting another code, or restart sign-in.', 429);
  }
  try {
    await sendLoginCode(user.email, code);
    const ready = await User.updateOne({ _id: user._id, 'loginFactor.challengeHash': factor.challengeHash }, { $set: { 'loginFactor.ready': true } });
    if (!ready.modifiedCount) throw new Error('Superseded challenge');
  } catch {
    await User.updateOne({ _id: user._id, 'loginFactor.challengeHash': factor.challengeHash }, { $set: { 'loginFactor.used': true, 'loginFactor.ready': false } });
    throw failure('Email delivery is unavailable. Wait a minute, then sign in again.', 503);
  }
  return { ...metadata(factor), challenge };
}

const validChallenge = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
module.exports = { hash, secret, codeHash, failure, metadata, issue, validChallenge };
