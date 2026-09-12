// Audit before normalization so existing conflicting accounts are never merged or deleted.
async function prepareStudentIds(User) {
  const users = await User.find({ studentId: { $type: "string" } }).select("_id studentId").lean();
  const owners = new Map();
  for (const user of users) {
    const id = user.studentId.trim().toUpperCase();
    if (!id) continue;
    if (owners.has(id)) throw new Error(`Duplicate student ID ${id} on accounts ${owners.get(id)} and ${user._id}. Correct these IDs before restarting.`);
    owners.set(id, user._id);
  }
  for (const user of users) {
    const id = user.studentId.trim().toUpperCase();
    if (id !== user.studentId || !id) {
      await User.collection.updateOne({ _id: user._id, studentId: user.studentId }, id ? { $set: { studentId: id } } : { $unset: { studentId: 1 } });
    }
  }
  await User.createIndexes();
}

module.exports = { prepareStudentIds };
