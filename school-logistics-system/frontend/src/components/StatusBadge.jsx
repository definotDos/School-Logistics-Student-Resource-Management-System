function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-50 text-yellow-700",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    allocated: "bg-blue-50 text-blue-700",
    scheduled: "bg-purple-50 text-purple-700",
    claimed: "bg-green-50 text-green-700",
    released: "bg-emerald-50 text-emerald-700",
  };

  const style =
    styles[status?.toLowerCase()] || "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${style}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;