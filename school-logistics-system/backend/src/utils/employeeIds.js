const { idType, normalize } = require('./accountValidation');

// Audit all destination IDs before changing any records. Safe to run repeatedly.
async function prepareEmployeeIds(User) {
  const users = await User.find({ role: { $in: ['staff', 'admin'] } }).select('_id role studentId employeeId').lean();
  const owners = new Map();
  const changes = [];
  for (const user of users) {
    const legacy = normalize(user.studentId).toUpperCase();
    const existing = normalize(user.employeeId).toUpperCase();
    if (legacy && existing && legacy !== existing) throw new Error(`Conflicting employee IDs on account ${user._id}. Correct before restarting.`);
    const employeeId = existing || legacy;
    if (!employeeId) continue;
    if (idType(employeeId) !== 'employee') throw new Error(`Invalid employee ID on account ${user._id}. Correct before restarting.`);
    if (owners.has(employeeId)) throw new Error(`Duplicate employee ID on accounts ${owners.get(employeeId)} and ${user._id}. Correct before restarting.`);
    owners.set(employeeId, user._id);
    if (user.studentId !== undefined || employeeId !== user.employeeId) changes.push({ user, employeeId });
  }
  for (const { user, employeeId } of changes) {
    const result = await User.collection.updateOne({ _id: user._id, role: user.role, studentId: user.studentId ?? { $exists: false }, employeeId: user.employeeId ?? { $exists: false } }, { $set: { employeeId }, $unset: { studentId: 1 } });
    if (result.matchedCount !== 1) throw new Error('Account changed during employee ID migration. Restart to retry.');
  }
}

module.exports = { prepareEmployeeIds };
