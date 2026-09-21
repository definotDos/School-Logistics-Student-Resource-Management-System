export function formatAuditLabel(value = "") {
  return String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatAuditTime(value) {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

// Color reflects the destination status, not the state before the change.
export function auditStatusTone(change = "") {
  const status = String(change).split(/→|->/).at(-1).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["completed", "released", "claimed"].includes(status)) return "complete";
  if (["approved", "eligible", "verified"].includes(status)) return "approved";
  if (["scheduled", "confirmed", "ready", "ready_for_claim"].includes(status)) return "scheduled";
  if (["pending", "under_review", "reserved"].includes(status)) return "pending";
  if (["rejected", "cancelled", "canceled", "failed"].includes(status)) return "rejected";
  return "neutral";
}

export function filterAuditLogs(logs, filters) {
  const query = filters.search.trim().toLowerCase();
  const start = filters.start ? new Date(`${filters.start}T00:00:00`).getTime() : null;
  const end = filters.end ? new Date(`${filters.end}T23:59:59.999`).getTime() : null;
  return logs.filter((log) => {
    const timestamp = log.timestamp ? new Date(log.timestamp).getTime() : NaN;
    if (filters.entity && log.entity !== filters.entity) return false;
    if (filters.action && log.action !== filters.action) return false;
    if ((start !== null || end !== null) && !Number.isFinite(timestamp)) return false;
    if (start !== null && timestamp < start) return false;
    if (end !== null && timestamp > end) return false;
    return !query || [log.actor, log.role, log.action, log.entity, log.entityId, log.details, log.statusChange]
      .some((value) => `${value || ""} ${formatAuditLabel(value || "")}`.toLowerCase().includes(query));
  }).sort((a, b) => {
    const first = a.timestamp ? new Date(a.timestamp).getTime() : NaN;
    const second = b.timestamp ? new Date(b.timestamp).getTime() : NaN;
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
    if (!Number.isFinite(second)) return -1;
    return filters.order === "oldest" ? first - second : second - first;
  });
}
