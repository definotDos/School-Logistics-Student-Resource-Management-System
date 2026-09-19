import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import useStudentTheme from "../../hooks/useStudentTheme";
import "./StudentDashboard.css";
import "./StudentPages.css";
import ResourceCard from "../../components/ResourceCard";
import ResourceCarousel from "../../components/ResourceCarousel";
import { requestAPI, resourceAPI } from "../../services/api";

function Resources() {
  const [isDarkMode, setIsDarkMode] = useStudentTheme();
  const requestDialogRef = useRef(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [selectedResource, setSelectedResource] = useState(null);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resources, setResources] = useState([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!selectedResource) return;
    const previousFocus = document.activeElement;
    const dialog = requestDialogRef.current;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, [selectedResource]);
  const resourcePresentation = (resource) => ({
    ...resource,
    quantity: resource.stock.available,
    image: resource.image || ({ "Mathematics Book": "/mathematics-book.svg", "Learning Modules": "/learning-modules.svg", "School Shoes": "/Shoes.jpg", "School Uniform": "/school-uniform.svg", "Student ID": "/student-id.svg" }[resource.name] || ""),
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
    if (!selectedResource) return;
    const quantity = Number(requestQuantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setRequestError("Quantity must be a positive whole number.");
      return;
    }
    if (quantity > Number(selectedResource.quantity || 0)) {
      setRequestError("The requested quantity exceeds the available stock.");
      return;
    }
    setSubmitting(true);
    setRequestError("");
    try {
      await requestAPI.create({
        resource: selectedResource._id,
        category: selectedResource.category,
        quantity,
      });
      setSubmitted(true);
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = (resource) => {
    setSelectedResource(resource);
    setRequestQuantity(1);
    setSubmitted(false);
    setRequestError("");
  };

  return (
    <div className={`dashboard-shell student-shell organized-workspace student-pages ${isDarkMode ? "dark-mode" : ""}`}>
      <Sidebar />

      <div className="dashboard-content flex flex-1 flex-col">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((current) => !current)} />

        <main className="resource-browser-page p-6 lg:p-8">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Available Resources
            </h1>

            <p className="mt-1 text-slate-500">
              Browse and request school-provided resources.
            </p>
          </div>

          {/* Search */}
          <div className="resource-browser-filters mb-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              aria-label="Search resources"
              placeholder="Search resources..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-600 outline-none">
              <option>All Categories</option>
              {[...new Set(resources.map(resource => resource.category))].sort().map(value => <option key={value}>{value}</option>)}
            </select>
          </div>

          {loadError && <p className="text-red-600" role="alert">{loadError}</p>}
          <ResourceCarousel key={`${category}:${query}`} resources={filteredResources} onRequest={handleRequest} />
          <p className="resource-results-count" role="status">{filteredResources.length} resources{category !== "All Categories" ? ` in ${category}` : " available to browse"}</p>
          <div className="resource-browser-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource._id}
                resource={resource}
                onRequest={handleRequest}
              />
            ))}
          </div>
          {filteredResources.length === 0 && <div className="empty-state">No resources match your search.</div>}

        </main>
      </div>
      {selectedResource && <dialog ref={requestDialogRef} className="app-modal resource-request-dialog" aria-labelledby="resource-request-title" onCancel={(event) => { if (submitting) event.preventDefault(); else setSelectedResource(null); }}>
        <button type="button" className="modal-close" onClick={() => setSelectedResource(null)} disabled={submitting} aria-label="Close request dialog">×</button>
        {!submitted ? <>
          <span className="request-dialog-kicker">RESOURCE REQUEST</span>
          <h2 id="resource-request-title">Request a resource</h2>
          <p>Choose your quantity and submit it for review.</p>
          <div className="request-dialog-summary"><span className="modal-icon" aria-hidden="true">{selectedResource.icon}</span><div><strong>{selectedResource.name}</strong><small>{selectedResource.category}</small></div><span className="request-dialog-stock">{selectedResource.quantity} in stock</span></div>
          <form onSubmit={(event) => { event.preventDefault(); confirmRequest(); }}>
          <div className="request-quantity-row">
            <label htmlFor="request-quantity">Quantity</label>
            <input
              id="request-quantity"
              type="number"
              min="1"
              max={selectedResource.quantity || 1}
              step="1"
              required
              disabled={submitting}
              aria-describedby="request-quantity-help"
              value={requestQuantity}
              onChange={(event) => setRequestQuantity(event.target.value)}
            />
          </div>
          <p id="request-quantity-help" className="request-quantity-help">Enter 1 to {selectedResource.quantity} units.</p>
          <p className="request-dialog-note">Student Affairs will review your request. Follow its status in My Requests.</p>
          {requestError && <p className="auth-error" role="alert">{requestError}</p>}
          <div className="modal-actions"><button type="button" className="modal-secondary" onClick={() => setSelectedResource(null)} disabled={submitting}>Cancel</button><button type="submit" className="modal-primary" disabled={submitting}>{submitting ? "Submitting..." : "Submit request"}</button></div>
          </form>
        </> : <>
          <div className="success-icon">✓</div><h2 id="resource-request-title">Request submitted</h2><p>Your request for {selectedResource.name} is now pending review.</p>
          <button className="modal-primary full" onClick={() => setSelectedResource(null)}>Done</button>
        </>}
      </dialog>}
    </div>
  );
}

export default Resources;
