import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import ResourceCard from "../../components/ResourceCard";
import { requestAPI, resourceAPI } from "../../services/api";

function Resources() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [selectedResource, setSelectedResource] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resources, setResources] = useState([]);
  const [loadError, setLoadError] = useState("");
  const resourcePresentation = (resource) => ({
    ...resource,
    quantity: resource.stock.available,
    image: resource.name === "Mathematics Book" ? "/mathematics-book.svg" : "",
    icon: resource.category === "Uniform" ? "👕" : resource.category === "Footwear" ? "👟" : resource.category === "Books" ? "📚" : resource.category === "Modules" ? "📖" : "🪪",
  });
  const filteredResources = useMemo(() => resources.filter((resource) => {
    const matchesQuery = resource.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All Categories" || resource.category === category;
    return matchesQuery && matchesCategory;
  }), [category, query, resources]);

  useEffect(() => {
    resourceAPI.getAll().then((result) => setResources(result.resources.map(resourcePresentation))).catch((error) => setLoadError(error.message));
  }, []);

  const confirmRequest = async () => {
    setSubmitting(true);
    setRequestError("");
    try {
      await requestAPI.create({ resource: selectedResource.name, category: selectedResource.category });
      setSubmitted(true);
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = (resource) => {
    setSelectedResource(resource);
    setSubmitted(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Available Resources
            </h1>

            <p className="mt-1 text-slate-500">
              Browse and request school-provided resources.
            </p>
          </div>

          {/* Search */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search resources..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-600 outline-none">
              <option>All Categories</option>
              <option>Books</option>
              <option>Uniform</option>
              <option>Footwear</option>
              <option>Modules</option>
              <option>Identification</option>
            </select>
          </div>

          {loadError && <p className="text-red-600" role="alert">{loadError}</p>}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.name}
                resource={resource}
                onRequest={handleRequest}
              />
            ))}
          </div>
          {filteredResources.length === 0 && <div className="empty-state">No resources match your search.</div>}

        </main>
      </div>
      {selectedResource && <div className="app-modal-backdrop"><section className="app-modal">
        <button className="modal-close" onClick={() => setSelectedResource(null)} aria-label="Close">×</button>
        {!submitted ? <>
          <div className="modal-icon">{selectedResource.icon}</div>
          <h2>Request {selectedResource.name}?</h2>
          <p>Your request will be reviewed by Student Affairs. You can track its progress in My Requests.</p>
          <div className="modal-actions"><button className="modal-secondary" onClick={() => setSelectedResource(null)}>Cancel</button><button className="modal-primary" onClick={confirmRequest} disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</button></div>
          {requestError && <p className="auth-error" role="alert">{requestError}</p>}
        </> : <>
          <div className="success-icon">✓</div><h2>Request submitted</h2><p>Your request for {selectedResource.name} is now pending review.</p>
          <button className="modal-primary full" onClick={() => setSelectedResource(null)}>Done</button>
        </>}
      </section></div>}
    </div>
  );
}

export default Resources;