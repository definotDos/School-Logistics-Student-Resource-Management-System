import { useEffect, useRef, useState } from "react";
import { reportsAPI } from "../services/api";
import { auditStatusTone, filterAuditLogs, formatAuditLabel, formatAuditTime } from "../utils/auditLogs";
import "./AuditLogPanel.css";

const initialFilters = { search: "", entity: "", action: "", start: "", end: "", order: "newest" };

export default function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);

  useEffect(() => {
    let cancelled = false;
    reportsAPI.getAuditLogReport().then((result) => {
      if (!cancelled) setLogs((result.logs || []).map((log, index) => ({ ...log, eventKey: index })));
    }).catch((failure) => {
      if (!cancelled) setError(failure.message || "Unable to load audit logs.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [revision]);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };
  const resetFilters = () => { setFilters(initialFilters); setPage(1); };
  const refresh = () => {
    setLoading(true);
    setError("");
    setPage(1);
    setRevision((current) => current + 1);
  };
  const invalidDates = Boolean(filters.start && filters.end && filters.start > filters.end);
  const filtered = invalidDates ? [] : filterAuditLogs(logs, filters);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;
  const visible = filtered.slice(offset, offset + pageSize);
  const options = (field) => [...new Set(logs.map((log) => log[field]).filter(Boolean))].sort();
  const hasFilters = Object.keys(initialFilters).some((key) => filters[key] !== initialFilters[key]);

  return <section className="admin-panel audit-panel" aria-labelledby="audit-heading">
    <div className="admin-panel-heading audit-heading">
      <div><h2 id="audit-heading">Audit logs</h2><p>Review who made a change, what changed, and when it happened.</p></div>
      <button className="admin-secondary" onClick={refresh} disabled={loading}>{loading ? "Loading…" : "Refresh logs"}</button>
    </div>
    <div className="audit-summary" aria-label="Audit summary">
      <div data-summary-tone="blue"><span>Loaded events</span><strong>{loading || error ? "—" : logs.length.toLocaleString()}</strong></div>
      <div data-summary-tone="teal"><span>Matching events</span><strong>{loading || error ? "—" : filtered.length.toLocaleString()}</strong></div>
      <div data-summary-tone="violet"><span>Event types</span><strong>{loading || error ? "—" : options("action").length}</strong></div>
    </div>
    <div className="audit-filters">
      <label className="audit-search">Search logs<input type="search" value={filters.search} placeholder="Search person, event, details, or record ID" onChange={(event) => updateFilter("search", event.target.value)} /></label>
      <label>Record type<select value={filters.entity} onChange={(event) => updateFilter("entity", event.target.value)}><option value="">All records</option>{options("entity").map((value) => <option key={value} value={value}>{formatAuditLabel(value)}</option>)}</select></label>
      <label>Event<select value={filters.action} onChange={(event) => updateFilter("action", event.target.value)}><option value="">All events</option>{options("action").map((value) => <option key={value} value={value}>{formatAuditLabel(value)}</option>)}</select></label>
      <label>From date<input type="date" value={filters.start} max={filters.end || undefined} onChange={(event) => updateFilter("start", event.target.value)} aria-invalid={invalidDates} aria-describedby={invalidDates ? "audit-date-error" : undefined} /></label>
      <label>To date<input type="date" value={filters.end} min={filters.start || undefined} onChange={(event) => updateFilter("end", event.target.value)} aria-invalid={invalidDates} aria-describedby={invalidDates ? "audit-date-error" : undefined} /></label>
      <label>Sort by<select value={filters.order} onChange={(event) => updateFilter("order", event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      {hasFilters && <button className="admin-secondary" onClick={resetFilters}>Clear filters</button>}
    </div>
    {invalidDates && <p className="audit-error" id="audit-date-error" role="alert">Choose an end date on or after the start date.</p>}
    <p className="audit-scope">Up to 1,000 most recent events in this workspace. Filters apply to loaded events. Times use your local timezone.</p>
    {loading ? <div className="audit-empty" role="status">Loading audit history…</div> : error ? <div className="audit-empty" role="alert"><strong>Audit logs could not be loaded</strong><p>{error}</p><button className="admin-secondary" onClick={refresh}>Try again</button></div> : <>
      <div className="audit-table-wrap" role="region" aria-label="Audit events" tabIndex={0}>
        <table className="audit-table">
          <caption className="audit-results" aria-live="polite">{filtered.length ? `Showing ${offset + 1}–${Math.min(offset + pageSize, filtered.length)} of ${filtered.length} matching events` : "No matching events"}</caption>
          <thead><tr><th scope="col">Event / record</th><th scope="col">Performed by</th><th scope="col">Date and time</th><th scope="col">Status change</th><th scope="col">Details</th></tr></thead>
          <tbody>{visible.map((log) => <tr key={log.eventKey}>
            <td><strong>{formatAuditLabel(log.action)}</strong><small>{formatAuditLabel(log.entity)}</small></td>
            <td><strong>{log.actor || "Unknown"}</strong><small>{formatAuditLabel(log.role || "Role unavailable")}</small></td>
            <td><time dateTime={log.timestamp || undefined}>{formatAuditTime(log.timestamp)}</time></td>
            <td><span className="audit-status" data-tone={auditStatusTone(log.statusChange)}>{log.statusChange && log.statusChange !== "N/A" ? formatAuditLabel(log.statusChange) : "Recorded"}</span></td>
            <td><button className="row-action" aria-label={`View ${formatAuditLabel(log.action)} by ${log.actor || "Unknown"} at ${formatAuditTime(log.timestamp)}`} onClick={() => setSelected(log)}>View details</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!visible.length && <div className="audit-empty"><strong>{logs.length ? "No events match your filters" : "No audit events yet"}</strong><p>{logs.length ? "Try a different search or date range." : "Recorded system changes will appear here."}</p>{hasFilters && <button className="admin-secondary" onClick={resetFilters}>Clear filters</button>}</div>}
      <div className="audit-pagination">
        <label>Rows per page<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <nav aria-label="Audit log pages"><button className="admin-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button className="admin-secondary" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></nav>
      </div>
    </>}
    <dialog ref={dialog} className="audit-dialog" aria-labelledby="audit-detail-title" onClose={() => setSelected(null)}>
      {selected && <><div className="audit-detail-heading"><div><span>Audit event details</span><h2 id="audit-detail-title">{formatAuditLabel(selected.action)}</h2></div><button className="admin-secondary" autoFocus onClick={() => setSelected(null)}>Close</button></div>
        <dl className="audit-detail-grid">
          <div><dt>Performed by</dt><dd>{selected.actor || "Unknown"}</dd></div>
          <div><dt>Role</dt><dd>{formatAuditLabel(selected.role || "Not available")}</dd></div>
          <div><dt>Date and time</dt><dd>{formatAuditTime(selected.timestamp)}</dd></div>
          <div><dt>Record type</dt><dd>{formatAuditLabel(selected.entity)}</dd></div>
          <div className="audit-detail-wide"><dt>Record ID</dt><dd><code>{selected.entityId || "Not available"}</code></dd></div>
          <div className="audit-detail-wide"><dt>Status change</dt><dd><span className="audit-status" data-tone={auditStatusTone(selected.statusChange)}>{selected.statusChange && selected.statusChange !== "N/A" ? formatAuditLabel(selected.statusChange) : "No status change recorded"}</span></dd></div>
          <div className="audit-detail-wide"><dt>Details</dt><dd className="audit-detail-description">{selected.details || "No additional details were recorded for this event."}</dd></div>
        </dl>
      </>}
    </dialog>
  </section>;
}
