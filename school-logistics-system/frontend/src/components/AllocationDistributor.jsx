import { useRef, useState } from "react";
import { assignedStaffId, canAssignAllocation, eligibleDistributors } from "../utils/allocations";

export default function AllocationDistributor({ row, staffMembers, onAssign }) {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const inFlight = useRef(false);
  const currentId = assignedStaffId(row);
  const eligible = eligibleDistributors(row, staffMembers);
  const currentName = row.assignedStaff?.name || staffMembers.find(staff => (staff.id || staff._id) === currentId)?.name || "Previously assigned staff";
  const assign = async event => {
    const staffId = event.target.value;
    if (inFlight.current || !staffId || staffId === currentId) return;
    inFlight.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      await onAssign(row, staffId);
      setFeedback({ message: "Assignment saved", error: false });
    } catch (error) {
      setFeedback({ message: error.message || "Could not save. Please try again.", error: true });
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  if (!canAssignAllocation(row)) return <div className="allocation-assigned-name"><strong>{currentId ? currentName : "No distributor recorded"}</strong><small>Assignment closed · {row.status}</small></div>;
  return <div className="allocation-assignment-control" aria-busy={saving}>
    <select className={`allocation-distributor ${currentId ? "is-assigned" : "is-unassigned"}`} aria-label={`Distributor for ${row.studentName}, ${row.resourceName}`} value={currentId} onChange={assign} disabled={saving || !eligible.length}>
      <option value="" disabled>Assign distributor</option>
      {currentId && !eligible.some(staff => (staff.id || staff._id) === currentId) && <option value={currentId} disabled>{currentName} (unavailable)</option>}
      {eligible.map(staff => <option key={staff.id || staff._id} value={staff.id || staff._id}>{staff.name}</option>)}
    </select>
    <small className={`allocation-assignment-hint ${feedback?.error ? "allocation-save-error" : ""}`} role={feedback?.error ? "alert" : "status"}>
      {saving ? "Saving assignment…" : feedback?.message || (!eligible.length ? "No active staff at this campus" : currentId ? "Distributor assigned" : "Awaiting assignment")}
    </small>
  </div>;
}
