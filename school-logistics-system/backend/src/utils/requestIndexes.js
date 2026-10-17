const activeStatuses = ["pending", "approved", "ready_for_claim", "claimed", "released"];
const activeRequestIndex = {
  name: "active_student_resource_style",
  unique: true,
  partialFilterExpression: { resourceRef: { $exists: true }, status: { $in: activeStatuses } },
};

async function prepareRequestIndexes(Request) {
  // Establish replacement protection before removing the old resource-only rule.
  await Request.collection.createIndex({ student: 1, resourceRef: 1, uniformStyle: 1 }, activeRequestIndex);
  const indexes = await Request.collection.indexes();
  for (const index of indexes) {
    if (index.unique && Object.keys(index.key).length === 2
      && index.key.student === 1 && index.key.resourceRef === 1) {
      await Request.collection.dropIndex(index.name);
    }
  }
}

module.exports = { activeRequestIndex, prepareRequestIndexes };
