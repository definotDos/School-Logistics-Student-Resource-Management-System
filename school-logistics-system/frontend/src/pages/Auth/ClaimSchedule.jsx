import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import { distributionAPI } from "../../services/api";

function ClaimSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    distributionAPI.getMySchedules()
      .then((result) => setSchedules(result.schedules || []))
      .catch((scheduleError) => setError(scheduleError.message));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <h1 className="text-2xl font-bold text-slate-900">
            Claim Schedule
          </h1>

          <p className="mt-1 text-slate-500">
            View your scheduled resource claims.
          </p>

          {error && <p className="mt-8 text-red-600" role="alert">{error}</p>}
          {!error && !schedules.length && <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-500">No claim schedule has been assigned yet.</p>}
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {schedules.map((schedule) => (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-6" key={schedule._id}>
                <p className="text-sm font-medium text-blue-700">Scheduled Claim</p>
                <h2 className="mt-3 text-xl font-bold text-slate-900">{schedule.resource?.name || "Resource"}</h2>
                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  <p>Date: {schedule.pickupDate ? new Date(schedule.pickupDate).toLocaleDateString() : "Not set"}</p>
                  <p>Time: {schedule.startTime} - {schedule.endTime}</p>
                  <p>Location: {schedule.location}</p>
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