import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import { distributionAPI } from "../../services/api";

function ClaimSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSchedules = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError("");
    try {
      const result = await distributionAPI.getMySchedules();
      setSchedules(result.schedules || []);
    } catch (scheduleError) {
      setError(scheduleError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    distributionAPI.getMySchedules()
      .then((result) => setSchedules(result.schedules || []))
      .catch((scheduleError) => setError(scheduleError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Claim Schedule</h1>
              <p className="mt-1 text-slate-500">View your scheduled resource claims.</p>
            </div>
            <button type="button" onClick={() => loadSchedules(true)} disabled={loading || refreshing} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700" role="alert"><p>{error}</p><button type="button" onClick={() => loadSchedules()} className="mt-2 font-medium underline">Try again</button></div>}
          {!error && loading && <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading your claim schedules...</p>}
          {!error && !loading && !schedules.length && <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-500">No claim schedule has been assigned yet.</p>}
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {schedules.map((schedule) => (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-6" key={schedule._id}>
                <p className="text-sm font-medium text-blue-700">Scheduled Claim</p>
                <h2 className="mt-3 text-xl font-bold text-slate-900">{schedule.resource?.name || "Resource"}</h2>
                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  <p>Date: {schedule.pickupDate ? new Date(schedule.pickupDate).toLocaleDateString() : "Not set"}</p>
                  <p>Time: {schedule.startTime} - {schedule.endTime}</p>
                  <p>Location: {schedule.location}</p>
                  <p>Quantity: {schedule.allocation?.quantity || schedule.quantityClaimed || 1}</p>
                  {schedule.campus && <p>Campus: {schedule.campus}</p>}
                </div>
                <div className="mt-5"><StatusBadge status={schedule.status || "Scheduled"} /></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClaimSchedule;