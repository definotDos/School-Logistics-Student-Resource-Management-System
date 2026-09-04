import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import { distributionAPI } from "../../services/api";

const filterOptions = ["all", "released", "completed", "received", "prepared", "pending"];

function DistributionHistory() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const applyHistoryResult = (result) => {
    const items = [...(result.distributions || [])].sort(
      (a, b) => new Date(b.releasedAt || b.createdAt || 0) - new Date(a.releasedAt || a.createdAt || 0)
    );
    setHistory(items);
    setLastUpdated(new Date());
  };

  const loadHistory = async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const result = await distributionAPI.getAll();
      applyHistoryResult(result);
    } catch (historyError) {
      setError(historyError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    distributionAPI.getAll()
      .then(applyHistoryResult)
      .catch((historyError) => setError(historyError.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleHistory = useMemo(() => {
    if (filter === "all") return history;
    return history.filter((item) => (item.status || "").toLowerCase() === filter);
  }, [history, filter]);

  const totalItems = history.reduce(
    (sum, item) => sum + Number(item.quantityDelivered || item.quantity || 0),
    0
  );
  const latestRelease = history[0]?.releasedAt ? new Date(history[0].releasedAt) : null;
  const releasedCount = history.filter((item) => ["released", "completed"].includes((item.status || "").toLowerCase())).length;
  const completedCount = history.filter((item) => (item.status || "").toLowerCase() === "completed").length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.12em] text-violet-600">Student Portal</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">Distribution History</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700">
                {history.length} total record{history.length === 1 ? "" : "s"}
              </span>
              <button type="button" onClick={() => loadHistory()} disabled={loading || refreshing} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-slate-600">
            Review all resources that were released, picked up, or completed for your student account.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Total items received</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{totalItems}</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Latest release</p>
              <h2 className="mt-2 text-lg font-bold text-slate-900">
                {latestRelease ? latestRelease.toLocaleDateString() : "No releases yet"}
              </h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Status overview</p>
              <h2 className="mt-2 text-lg font-bold text-slate-900">
                {releasedCount} released · {completedCount} completed
              </h2>
            </div>
          </div>

          {lastUpdated && !loading && <p className="mt-3 text-right text-xs text-slate-400">Updated {lastUpdated.toLocaleTimeString()}</p>}

          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    filter === option
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option === "all" ? "All" : option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" role="alert"><p>{error}</p><button type="button" onClick={() => loadHistory({ initial: true })} className="mt-2 font-medium underline">Try again</button></div>}

            {!error && loading && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
                Loading your distribution history...
              </div>
            )}

            {!error && !loading && !visibleHistory.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                <p className="text-lg font-medium text-slate-700">No distribution records found</p>
                <p className="mt-2">Your released and completed resource history will appear here once a staff member processes your request.</p>
              </div>
            )}

            {!error && !loading && visibleHistory.map((item, index) => {
              const resourceName = item.resource?.name || item.resourceName || "Resource";
              const dateText = item.releasedAt
                ? new Date(item.releasedAt).toLocaleDateString()
                : item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : "Date unavailable";
              const location = item.distributionLocation || item.location || "Campus office";
              const quantity = item.quantityDelivered || item.quantity || 0;
              const status = item.status || "Released";

              return (
                <article
                  key={item._id || `${resourceName}-${dateText}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-lg font-bold text-violet-700">
                        {resourceName.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{resourceName}</h3>
                        <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-500">
                          <span>Released: {dateText}</span>
                          <span>Quantity: {quantity}</span>
                          <span>Location: {location}</span>
                          {item.campus && <span>Campus: {item.campus}</span>}
                        </div>
                        {item.referenceId && (
                          <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                            Ref: {item.referenceId}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DistributionHistory;