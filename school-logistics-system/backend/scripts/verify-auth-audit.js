const crypto = require('crypto');
const fs = require('fs');
function verifyAudit(lines, key) {
  if (!key || Buffer.byteLength(key) < 32) throw new Error('AUTH_AUDIT_SECRET is required');
  const streams = new Map();
  let count = 0;
  for (const line of lines.split(/\r?\n/).filter(Boolean)) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.event !== 'authentication') continue;
    const { signature, ...record } = entry;
    const expected = streams.get(record.stream) || { sequence: 0, signature: '0'.repeat(64) };
    const digest = crypto.createHmac('sha256', key).update(JSON.stringify(record)).digest('hex');
    if (!/^[a-f0-9]{64}$/.test(signature || '') || !crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex')) ||
        record.sequence !== expected.sequence + 1 || record.previous !== expected.signature) throw new Error('Audit integrity verification failed');
    streams.set(record.stream, { sequence: record.sequence, signature }); count++;
  }
  if (!count) throw new Error('No authentication records found');
  return { count, anchors: Object.fromEntries(streams) };
}
if (require.main === module) {
  try {
    const result = verifyAudit(fs.readFileSync(process.argv[2], 'utf8'), process.env.AUTH_AUDIT_SECRET);
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { verifyAudit };
