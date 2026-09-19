import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import useStudentTheme from "../../hooks/useStudentTheme";
import "./StudentDashboard.css";
import "./StudentPages.css";
import StatusBadge from "../../components/StatusBadge";
import DashboardIcon from "../../components/DashboardIcon";
import { campuses } from "../../data/campuses";
import "./ClaimSchedule.css";
import { distributionAPI } from "../../services/api";

function ClaimSchedule() {
  const [isDarkMode, setIsDarkMode] = useStudentTheme();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const isActive = (schedule) => ["scheduled", "confirmed"].includes((schedule.status || "Scheduled").toLowerCase());
  const isCompleted = (schedule) => ["completed", "claimed", "released"].includes((schedule.status || "").toLowerCase());
  const visibleSchedules = schedules.filter((schedule) => filter === "all" || (filter === "active" ? isActive(schedule) : isCompleted(schedule)));
  const filterOptions = [
    { value: "all", label: "All claims", count: schedules.length },
    { value: "active", label: "Scheduled / confirmed", count: schedules.filter(isActive).length },
    { value: "completed", label: "Completed", count: schedules.filter(isCompleted).length },
  ];

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
    <div className={`dashboard-shell student-shell organized-workspace student-pages ${isDarkMode ? "dark-mode" : ""}`}>
      <Sidebar />

      <div className="dashboard-content flex flex-1 flex-col">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((current) => !current)} />

        <main className="student-animated-page claim-schedule-page p-6 lg:p-8">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="claim-page-kicker">STUDENT PORTAL / COLLECTIONS</span>
              <h1 className="text-2xl font-bold text-slate-900">Claim Schedule</h1>
              <p className="mt-1 text-slate-500">Your pickup dates, locations, and collection status in one place.</p>
            </div>
            <button type="button" onClick={() => loadSchedules(true)} disabled={loading || refreshing} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700" role="alert"><p>{error}</p><button type="button" onClick={() => loadSchedules()} className="mt-2 font-medium underline">Try again</button></div>}
          {!loading && <div className="claim-filter-bar" role="group" aria-label="Filter claims by status">{filterOptions.map((option) => <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>{option.label}<span>{option.count}</span></button>)}</div>}
          {!error && loading && <p className="claim-state" role="status">Loading your claim schedules...</p>}
          {!error && !loading && !visibleSchedules.length && <div className="claim-state"><DashboardIcon name="calendar" /><h2>{schedules.length ? "No claims in this category" : "No collections scheduled yet"}</h2><p>{schedules.length ? "Choose another filter to see your other claims." : "Your pickup details will appear here when a schedule is assigned."}</p></div>}
          <div className="claim-schedule-list" aria-busy={loading || refreshing}>
            {visibleSchedules.map((schedule) => {
              const date = schedule.pickupDate ? new Date(schedule.pickupDate) : null;
              const validDate = date && !Number.isNaN(date.getTime());
              const campus = campuses.find((item) => item.name.toLowerCase() === (schedule.campus || "").trim().toLowerCase());
              return <article className="claim-schedule-card" key={schedule._id}>
                <div className="claim-date-tile" aria-hidden="true"><span>{validDate ? date.toLocaleDateString(undefined, { month: "short" }) : "DATE"}</span><strong>{validDate ? date.getDate() : "—"}</strong><small>{validDate ? date.getFullYear() : "Not set"}</small></div>
                <div className="claim-card-content">
                  <div className="claim-card-heading"><div><span className="claim-page-kicker">RESOURCE COLLECTION</span><h2>{schedule.resource?.name || "Resource"}</h2></div><StatusBadge status={schedule.status || "Scheduled"} /></div>
                  <dl className="claim-pickup-details">
                    <div><dt>Pickup date</dt><dd>{validDate ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Not set"}</dd></div>
                    <div><dt>Time window</dt><dd>{schedule.startTime && schedule.endTime ? `${schedule.startTime} – ${schedule.endTime}` : "Not set"}</dd></div>
                    <div><dt>Pickup location</dt><dd>{schedule.location || "Not assigned"}</dd></div>
                    <div><dt>Quantity</dt><dd>{schedule.allocation?.quantity ?? schedule.quantityClaimed ?? 1} unit(s)</dd></div>
                  </dl>
                  {schedule.campus && <div className="claim-campus"><span className="claim-campus-logo">{campus?.logo ? <img src={campus.logo} alt="" /> : <DashboardIcon name="school" />}</span><span className="claim-campus-copy"><small>Campus</small><strong>{schedule.campus}</strong></span></div>}
                </div>
              </article>;
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClaimSchedule;
