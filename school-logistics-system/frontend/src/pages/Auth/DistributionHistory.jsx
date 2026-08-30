import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import { distributionAPI } from "../../services/api";

function DistributionHistory() {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    distributionAPI.getAll()
      .then((result) => setHistory(result.distributions || []))
      .catch((historyError) => setError(historyError.message));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <h1 className="text-2xl font-bold text-slate-900">
            Distribution History
          </h1>

          <p className="mt-1 text-slate-500">
            View the resources that have been successfully released to you.
          </p>

          <div className="mt-8 space-y-3">
            {error && <p className="text-red-600" role="alert">{error}</p>}
            {!error && !history.length && <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">No distributed resources yet.</p>}
            {history.map((item, index) => (
              <div
                key={item._id || index}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <h3 className="font-medium text-slate-900">
                    {item.resource?.name || "Resource"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Released on {item.releasedAt ? new Date(item.releasedAt).toLocaleDateString() : "Date unavailable"}
                  </p>
                </div>

                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}

export default DistributionHistory;