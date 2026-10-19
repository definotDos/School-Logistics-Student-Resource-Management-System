export const assignedStaffId = row => row.assignedStaff?._id || row.assignedStaff?.id || (typeof row.assignedStaff === "string" ? row.assignedStaff : "");
export const canAssignAllocation = row => ["reserved", "scheduled"].includes(row.status?.toLowerCase());
export const needsDistributor = row => canAssignAllocation(row) && !assignedStaffId(row);
export const eligibleDistributors = (row, staffMembers) => staffMembers
  .filter(staff => staff.role === "staff" && staff.status === "active" && staff.campus === row.campus)
  .sort((a, b) => a.name.localeCompare(b.name));
