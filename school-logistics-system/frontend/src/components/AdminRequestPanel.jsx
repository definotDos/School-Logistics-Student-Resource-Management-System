import { useTabState } from "../hooks/useTabState";
import { useRef, useState } from "react";
import "./AdminRequestPanel.css";

const statuses = ["pending", "approved", "rejected", "cancelled", "ready_for_claim", "claimed", "released", "completed"];
const label = (value = "") => value.replaceAll("_", " ");
const resourceName = row => row.resourceName || row.resource || "Resource";
const studentId = row => row.studentId || row.student?.studentId || "Not provided";
const timestamp = row => Date.parse(row.date || row.createdAt) || 0;
const dateLabel = value => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

export default function AdminRequestPanel({ requests, loading, requestError, approveRequest }) {
  const [search, setSearch] = useTabState("AdminRequestPanel.search", "");
  const [status, setStatus] = useTabState("AdminRequestPanel.status", "pending");
  const [sort, setSort] = useTabState("AdminRequestPanel.sort", "oldest");
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const dialog = useRef(null);
  const submitting = useRef(false);
  const selected = requests.find(row => row.databaseId === selectedId);
  const pending = requests.filter(row => row.status === "pending").length;
  const filtered = requests.filter(row => (!status || row.status === status) &&
    [resourceName(row), row.student?.name, studentId(row), row.id, row.campus, row.student?.email].join(" ").toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => sort === "newest" ? timestamp(b) - timestamp(a) : timestamp(a) - timestamp(b));
  const open = row => { setSelectedId(row.databaseId); setConfirmed(false); dialog.current.showModal(); };
  const approve = async () => {
    if (submitting.current || !selected || !confirmed) return;
    submitting.current = true;
    setBusy(true);
    try { await approveRequest(selected); }
    finally { submitting.current = false; setBusy(false); }
  };

  return <section className="admin-panel request-workspace" aria-busy={loading}>
    <header className="request-heading"><div><h2>Requests awaiting action</h2><p>{loading ? "Loading requests…" : `${pending} pending review · ${requests.length} total requests`}</p></div><span className="request-queue-tag">Review queue</span></header>
    <div className="request-summary" aria-label="Request summary">
      {[["pending", "Awaiting review", pending], ["approved", "Approved", requests.filter(row => row.status === "approved").length], ["ready_for_claim", "Ready for claim", requests.filter(row => row.status === "ready_for_claim").length], ["", "All requests", requests.length]].map(([value, title, count]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}><span>{title}</span><strong>{loading ? "—" : count}</strong></button>)}
    </div>
    <div className="request-filters">
      <label className="request-search">Search requests<input type="search" placeholder="Student, ID, resource, or campus" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label>
    </div>
    {requestError && <p className="auth-error" role="alert">{requestError}</p>}
    {loading ? <p className="request-empty" role="status">Loading student requests…</p> : <>
      <div className="request-table-wrap"><table className="request-table"><caption>Showing {filtered.length} of {requests.length} requests</caption><thead><tr><th scope="col">Resource / request</th><th scope="col">Student</th><th scope="col">Quantity</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>
        {filtered.map(row => <tr key={row.databaseId}><td><strong>{resourceName(row)}</strong><small>{row.id}</small></td><td><strong>{row.student?.name || "Student"}</strong><small>ID: {studentId(row)}</small><small>{row.campus || row.student?.campus || "Campus not provided"}</small></td><td>{row.quantity ?? "—"}</td><td>{dateLabel(row.date || row.createdAt)}</td><td><span className={`status-pill ${row.status}`}>{label(row.status)}</span></td><td><button type="button" className="row-action" aria-label={`View ${row.id}, ${resourceName(row)} for ${row.student?.name || "student"}`} onClick={() => open(row)}>View details</button></td></tr>)}
      </tbody></table></div>
      {!filtered.length && <div className="request-empty"><strong>{requests.length ? status === "pending" && !search ? "You're all caught up" : "No matching requests" : "No student requests yet"}</strong><p>{requests.length ? "Choose another status or search to view more requests." : "New student requests will appear here for review."}</p>{requests.length > 0 && <button className="row-action" onClick={() => { setSearch(""); setStatus(""); }}>View all requests</button>}</div>}
    </>}
    <dialog ref={dialog} className="request-dialog" aria-labelledby="request-detail-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      {selected && <><header className="request-heading"><div><small>{selected.id}</small><h2 id="request-detail-title">{resourceName(selected)}</h2><p>Request details</p></div><button type="button" className="row-action" disabled={busy} onClick={() => dialog.current.close()} aria-label="Close request details">Close</button></header>
        <div className="request-detail-body"><span className={`status-pill ${selected.status}`}>{label(selected.status)}</span><dl className="request-details">
          {[["Student", selected.student?.name], ["Student ID", studentId(selected)], ["Email", selected.student?.email], ["Campus", selected.campus || selected.student?.campus], ["Category", selected.category], ["Quantity", selected.quantity], ["Eligibility", label(selected.eligibilityStatus)], ["Priority", selected.priority], ["Submitted", dateLabel(selected.date || selected.createdAt)]].map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value || "Not provided"}</dd></div>)}
        </dl><div className="request-notes"><h3>Student notes</h3><p>{selected.notes || "No notes provided."}</p></div>
        {selected.reason && <div className="request-notes"><h3>Review notes</h3><p>{selected.reason}</p></div>}
        {selected.rejectionReason && <div className="request-notes"><h3>Rejection reason</h3><p>{selected.rejectionReason}</p></div>}
        <dl className="request-details">{[["Eligibility checked", selected.checkedAt], ["Approved", selected.approvedAt], ["Rejected", selected.rejectedAt], ["Cancelled", selected.cancelledAt], ["Claimed", selected.claimedAt], ["Released", selected.releasedAt]].filter(([, value]) => value).map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{dateLabel(value)}</dd></div>)}</dl>
        {requestError && <p className="auth-error" role="alert">{requestError}</p>}
        {selected.status === "pending" ? <div className="request-review"><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /><span>I have confirmed the student's identity, campus eligibility, and requested quantity.</span></label><p>Approval verifies eligibility and reserves available stock. Requests with insufficient stock cannot be approved.</p><button type="button" className="admin-primary" disabled={!confirmed || busy} onClick={approve}>{busy ? "Approving…" : "Approve request"}</button></div> : <p className="request-review" role="status">{selected.status === "approved" ? "Approved. This request is available in Resource allocation." : `This request is ${label(selected.status)}.`}</p>}
        </div></>}
    </dialog>
  </section>;
}
