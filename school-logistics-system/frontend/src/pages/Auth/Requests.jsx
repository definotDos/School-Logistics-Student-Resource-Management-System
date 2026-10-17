import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import useStudentTheme from "../../hooks/useStudentTheme";
import "./StudentDashboard.css";
import "./StudentPages.css";
import StatusBadge from "../../components/StatusBadge";
import { requestAPI } from "../../services/api";
import { Link } from "react-router-dom";
import RequestResourceImage from "../../components/RequestResourceImage";
import "../../components/RequestCards.css";
import "./Requests.css";

function Requests() {
  const [isDarkMode, setIsDarkMode] = useStudentTheme();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const filteredRequests = requests.filter(request => !filter || request.status === filter);

  const cancelRequest = async (requestId) => {
    if (busyId) return;
    setBusyId(requestId); setError(""); setNotice("");
    try {
      const result = await requestAPI.cancel(requestId);
      setRequests((current) => current.map((request) => request.databaseId === requestId ? { ...request, ...result.request } : request));
      setNotice("Request cancelled and saved to the database.");
    } catch (requestError) {
      setError(requestError.message);
    } finally { setBusyId(null); }
  };

  useEffect(() => {
    let active = true;
    requestAPI.getMyRequests()
      .then((result) => { if (active) setRequests(result.requests || []); })
      .catch((error) => { if (active) setError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className={`dashboard-shell student-shell organized-workspace student-pages ${isDarkMode ? "dark-mode" : ""}`}>
      <Sidebar />

      <div className="dashboard-content flex flex-1 flex-col">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((current) => !current)} />

        <main className="student-animated-page requests-page p-6 lg:p-8">

          <header className="student-page-heading">
          <span className="dashboard-kicker">Student portal / Requests</span>
          <h1 className="text-2xl font-bold text-slate-900">
            My Requests
          </h1>

          <p className="mt-1 text-slate-500">
            Track the status of your resource requests.
          </p>
          </header>
          {notice && <p className="mt-4 text-green-700" role="status">{notice}</p>}

          <div className="request-card-toolbar">
            <span className="request-result-count" role="status">{loading ? "Loading requests..." : `${filteredRequests.length} request${filteredRequests.length === 1 ? "" : "s"}${filter ? ` of ${requests.length}` : ""}`}</span>
            <label>Filter status <select value={filter} onChange={event => setFilter(event.target.value)}>
              <option value="">All statuses</option>
              {[...new Set(requests.map(request => request.status))].map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select></label>
            <Link to="/resources">Browse resources</Link>
          </div>
          {error && <p role="alert" className="auth-error">{error}</p>}
          <div className="student-request-cards" aria-busy={loading}>
            {loading ? <p className="request-empty" role="status">Loading your requests...</p> : !filteredRequests.length ? <p className="request-empty">{requests.length ? "No requests match this status. Choose another filter." : "No requests yet. Browse resources to submit one."}</p> : filteredRequests.map(request => (
              <article className="student-request-card" key={request.databaseId}>
                <div className="request-card-main">
                  <RequestResourceImage request={request} />
                  <div className="request-card-copy">
                    <h2>{request.resourceName || request.resource || "Resource"}</h2>
                    <p className="request-owner"><span>{request.student?.name || "Your request"}</span><span>{request.campus || request.student?.campus || "Campus not recorded"}</span></p>
                    <dl className="request-details">
                      <div><dt>Quantity</dt><dd>{request.quantity} unit{request.quantity === 1 ? "" : "s"}</dd></div>
                      {request.uniformStyle && <div><dt>Style / Size</dt><dd>{request.uniformStyle}{request.uniformSize ? ` / ${request.uniformSize}` : ""}</dd></div>}
                      <div><dt>Request ID</dt><dd>{request.id || "Not recorded"}</dd></div>
                      <div><dt>Date requested</dt><dd>{request.date ? new Date(request.date).toLocaleDateString() : "Not recorded"}</dd></div>
                    </dl>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <div className="request-card-footer">
                  <p>{request.status === "pending" ? "Awaiting eligibility review and approval." : request.status === "approved" ? "Approved. Staff will arrange your pickup schedule." : request.status === "ready_for_claim" ? "Your resource is ready. Check your pickup schedule." : request.status === "rejected" ? request.rejectionReason || "This request was not approved." : request.status === "cancelled" ? "This request has been cancelled." : "Your collection has been recorded."}</p>
                  {request.status === "pending" && <button type="button" disabled={!!busyId} onClick={() => cancelRequest(request.databaseId)}>{busyId === request.databaseId ? "Cancelling..." : "Cancel request"}</button>}
                  {["approved", "ready_for_claim"].includes(request.status) && <Link to="/claim-schedule">View pickup schedule</Link>}
                </div>
              </article>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}

export default Requests;
