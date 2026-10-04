const crypto = require('crypto');
// Chained HMAC records. Ship stdout to append-only storage and retain chain anchors.
const stream = crypto.randomUUID();
let previous = '0'.repeat(64);
let sequence = 0;
function audit(event) {
  const key = process.env.AUTH_AUDIT_SECRET;
  if (!key || Buffer.byteLength(key) < 32) {
    console.error(JSON.stringify({ event: 'audit_configuration_missing' }));
    return;
  }
  const record = { stream, sequence: ++sequence, previous, ...event };
  const signature = crypto.createHmac('sha256', key).update(JSON.stringify(record)).digest('hex');
  previous = signature;
  console.info(JSON.stringify({ ...record, signature }));
}
module.exports = audit;
