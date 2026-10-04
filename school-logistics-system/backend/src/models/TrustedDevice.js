const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  fingerprint: { type: String, required: true, select: false },
  sessionVersion: { type: Number, required: true },
  emailHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, expires: 0 },
  revokedAt: Date,
}, { timestamps: true });
module.exports = mongoose.model('TrustedDevice', schema);
