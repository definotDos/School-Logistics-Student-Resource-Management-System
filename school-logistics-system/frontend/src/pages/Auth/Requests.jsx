import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import { requestAPI, resourceAPI } from "../../services/api";

function Requests() {
  const [requests, setRequests] = useState([]);
  const [resourceNames, setResourceNames] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const cancelRequest = async (requestId) => {
    try {
      await requestAPI.cancel(requestId);
      setRequests((current) => current.map((request) => request.databaseId === requestId ? { ...request, status: "cancelled" } : request));
      setNotice("Request cancelled and saved to the database.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    requestAPI.getMyRequests().then((result) => setRequests(result.requests || [])).catch((requestError) => setError(requestError.message));
    resourceAPI.getAll().then((result) => {
      const map = {};
      result.resources.forEach((resource) => {
        map[resource._id] = resource.name;
      });
      setResourceNames(map);
    }).catch(() => setResourceNames({}));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <h1 className="text-2xl font-bold text-slate-900">
            My Requests
          </h1>

          <p className="mt-1 text-slate-500">
            Track the status of your resource requests.
          </p>
          {notice && <p className="mt-4 text-green-700" role="status">{notice}</p>}

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                {error && <p className="p-6 text-red-600" role="alert">{error}</p>}
                {!error && !requests.length && <p className="p-6 text-slate-500">No requests yet. Browse resources to submit one.</p>}
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Request ID</th>
                    <th className="px-6 py-4 font-medium">Resource</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {request.id}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {resourceNames[request.resourceId] || request.resourceName || request.resource || "Resource"}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {new Date(request.date).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-6 py-4">
                        {request.status === "pending" && <button className="text-red-600 hover:underline" type="button" onClick={() => cancelRequest(request.databaseId)}>Cancel</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

export default Requests;