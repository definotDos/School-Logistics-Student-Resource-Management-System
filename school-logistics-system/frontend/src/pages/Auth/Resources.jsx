import { useTabState } from "../../hooks/useTabState";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import useStudentTheme from "../../hooks/useStudentTheme";
import "./StudentDashboard.css";
import "./StudentPages.css";
import "./Resources.css";
import DashboardIcon from "../../components/DashboardIcon";
import ResourceCard from "../../components/ResourceCard";
import ResourceCarousel from "../../components/ResourceCarousel";
import { getResourceImage } from "../../utils/resourceImages";
import { getUniformStyleImage, isSchoolUniform } from "../../utils/uniforms";
import { requestAPI, resourceAPI } from "../../services/api";

function Resources() {
  const [isDarkMode, setIsDarkMode] = useStudentTheme();
  const requestDialogRef = useRef(null);
  const [query, setQuery] = useTabState("Resources.query", "");
  const [category, setCategory] = useTabState("Resources.category", "All Categories");
  const [selectedResource, setSelectedResource] = useState(null);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [uniformStyle, setUniformStyle] = useState("Trojan T-shirt");
  const [uniformSize, setUniformSize] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissionWarning, setSubmissionWarning] = useState("");
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resources, setResources] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("default");
  const quantityLimit = selectedResource ? Math.min(Number(selectedResource.quantity) || 0, Number(selectedResource.maxQuantityPerStudent) || 5) : 0;
  const categories = [...new Set(resources.map(resource => resource.category))].sort();
  const availableCount = resources.filter(resource => resource.quantity > 0 && resource.status !== "Discontinued").length;
  const hasFilters = Boolean(query || category !== "All Categories" || availableOnly);
  const resetFilters = () => { setQuery(""); setCategory("All Categories"); setAvailableOnly(false); };
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
    image: getResourceImage(resource),
    icon: resource.category === "Uniform" ? "👕" : resource.category === "Footwear" ? "👟" : resource.category === "Books" ? "📚" : resource.category === "Modules" ? "📖" : "🪪",
  });
  const filteredResources = useMemo(() => resources.filter((resource) => {
    const matchesQuery = `${resource.name} ${resource.category}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === "All Categories" || resource.category === category;
    return matchesQuery && matchesCategory && (!availableOnly || (resource.quantity > 0 && resource.status !== "Discontinued"));
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "stock" ? b.quantity - a.quantity : 0), [category, query, resources, availableOnly, sort]);

  useEffect(() => {
    resourceAPI.getAll().then((result) => setResources(result.resources.map(resourcePresentation))).catch((error) => setLoadError(error.message)).finally(() => setLoading(false));
  }, []);

  const confirmRequest = async () => {
    if (!selectedResource || submitting) return;
    const quantity = Number(requestQuantity);
    if (isSchoolUniform(selectedResource) && !uniformSize) {
      setRequestError("Choose your preferred uniform size.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setRequestError("Quantity must be a positive whole number.");
      return;
    }
    if (quantity > quantityLimit) {
      setRequestError(`You can request up to ${quantityLimit} units of this item.`);
      return;
    }
    setSubmitting(true);
    setRequestError("");
    try {
      const result = await requestAPI.create({
        resource: selectedResource._id,
        category: selectedResource.category,
        quantity,
        ...(isSchoolUniform(selectedResource) ? { uniformStyle, uniformSize } : {}),
      });
      setSubmissionWarning(result.warning || "");
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
    setUniformStyle("Trojan T-shirt");
    setUniformSize("");
    setSubmitted(false);
    setSubmissionWarning("");
    setRequestError("");
  };

  return (
    <div className={`dashboard-shell student-shell organized-workspace student-pages landing-background resource-browser-shell ${isDarkMode ? "dark-mode" : ""}`}>
      <Sidebar />

      <div className="dashboard-content flex flex-1 flex-col">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((current) => !current)} />

        <main className="resource-browser-page p-6 lg:p-8">

          <header className="browse-heading">
            <div>
              <span className="dashboard-kicker">Student portal / Resources</span>
              <h1>Browse Resources</h1>
              <p>Find what you need for your next school day.</p>
            </div>
            <div className="browse-heading-icon" aria-hidden="true"><DashboardIcon name="browse" /></div>
          </header>

          <div className="browse-summary" aria-label="Resource overview">
            <div><DashboardIcon name="catalog" /><span><strong>{loading ? "?" : resources.length}</strong> Resources</span></div>
            <div><DashboardIcon name="overview" /><span><strong>{loading ? "?" : categories.length}</strong> Categories</span></div>
            <div><DashboardIcon name="audit" /><span><strong>{loading ? "?" : availableCount}</strong> Available to request</span></div>
          </div>

          <section className="resource-browser-filters browse-filter-panel" aria-label="Find resources">
            <div className="browse-search-row">
              <label className="browse-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
                <input type="search" aria-label="Search resources" placeholder="Search by name or category..." value={query} onChange={event => setQuery(event.target.value)} />
              </label>
              <label className="browse-availability"><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} /> In stock only</label>
            </div>
            <div className="browse-category-list" role="group" aria-label="Filter by category">
              {["All Categories", ...categories].map(value => <button type="button" key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>
                {value === "All Categories" ? "All resources" : value}<span>{value === "All Categories" ? resources.length : resources.filter(resource => resource.category === value).length}</span>
              </button>)}
            </div>
          </section>

          {loadError ? <div className="browse-empty" role="alert"><DashboardIcon name="notification" /><h2>Resources could not be loaded</h2><p>{loadError}</p></div> : loading ? <div aria-busy="true" aria-label="Loading resources">
            <p role="status" className="resource-results-count">Loading your school resources...</p>
            <div className="resource-browser-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(item => <div className="browse-skeleton" key={item} aria-hidden="true"><div /><span /><span /><span /></div>)}</div>
          </div> : <>
            {!hasFilters && <ResourceCarousel resources={resources} onRequest={handleRequest} />}
            <div className="browse-results-heading">
              <div><h2>{category === "All Categories" ? "All resources" : category}</h2><p className="resource-results-count" role="status">Showing {filteredResources.length} of {resources.length} resources</p></div>
              <div className="browse-results-actions">
                {hasFilters && <button type="button" className="browse-reset" onClick={resetFilters}>Clear filters</button>}
                <label className="browse-sort">Sort by <select value={sort} onChange={event => setSort(event.target.value)}><option value="default">Recommended</option><option value="name">Name: A-Z</option><option value="stock">Most in stock</option></select></label>
              </div>
            </div>
            <div className="resource-browser-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map(resource => <ResourceCard key={resource._id} resource={resource} onRequest={handleRequest} />)}
            </div>
            {filteredResources.length === 0 && <div className="browse-empty"><DashboardIcon name="catalog" /><h2>{hasFilters ? "No matching resources" : "Resources are on their way"}</h2><p>{hasFilters ? "Try another keyword or category, or include items that are out of stock." : "Check back here when your school adds resources."}</p>{hasFilters && <button type="button" className="browse-reset" onClick={resetFilters}>Clear filters</button>}</div>}
          </>}

        </main>
      </div>
      {selectedResource && <dialog ref={requestDialogRef} className="app-modal resource-request-dialog" aria-labelledby="resource-request-title" onCancel={(event) => { if (submitting) event.preventDefault(); else setSelectedResource(null); }}>
        <button type="button" className="modal-close" onClick={() => setSelectedResource(null)} disabled={submitting} aria-label="Close request dialog">×</button>
        {!submitted ? <>
          <span className="request-dialog-kicker">RESOURCE REQUEST</span>
          <h2 id="resource-request-title">{isSchoolUniform(selectedResource) ? "Request a uniform" : "Request a resource"}</h2>
          <p>Choose your quantity and submit it for review.</p>
          <div className="request-dialog-summary"><span className="modal-icon" aria-hidden="true">{selectedResource.icon}</span><div><strong>{selectedResource.name}</strong><small>{selectedResource.category}</small></div><span className="request-dialog-stock">{selectedResource.quantity} in stock</span></div>
          <form onSubmit={(event) => { event.preventDefault(); confirmRequest(); }}>
          {isSchoolUniform(selectedResource) && <fieldset className="uniform-request-options" disabled={submitting}>
            <legend>Uniform preferences</legend>
            <img className="uniform-request-preview" src={getUniformStyleImage(uniformStyle)} alt={`${uniformStyle}, front and back`} />
            <label htmlFor="uniform-style">Style</label>
            <select id="uniform-style" value={uniformStyle} onChange={(event) => { setUniformStyle(event.target.value); setRequestError(""); }}>
              <option>Trojan T-shirt</option>
              <option>CITE Polo</option>
            </select>
            <p>You can submit one active request per uniform style. Submit a separate request if you need both styles.</p>
            <span id="uniform-size-label">Preferred size <span aria-hidden="true">*</span></span>
            <div className="uniform-size-options" role="group" aria-labelledby="uniform-size-label" aria-describedby="uniform-size-help">
              {["XS", "S", "M", "L", "XL", "2XL", "3XL"].map((size) => <label key={size}>
                <input type="radio" name="uniform-size" value={size} checked={uniformSize === size} required onChange={(event) => setUniformSize(event.target.value)} />
                <span>{size}</span>
              </label>)}
            </div>
            <p id="uniform-size-help">Select your usual shirt size. Staff will confirm the fit and size availability before release.</p>
          </fieldset>}
          <div className="request-quantity-row">
            <label htmlFor="request-quantity">Quantity</label>
            <input
              id="request-quantity"
              type="number"
              min="1"
              max={quantityLimit}
              step="1"
              required
              disabled={submitting}
              aria-describedby="request-quantity-help"
              value={requestQuantity}
              onChange={(event) => setRequestQuantity(event.target.value)}
            />
          </div>
          <p id="request-quantity-help" className="request-quantity-help">{quantityLimit > 0 ? `Request 1–${quantityLimit} units. Limit: ${selectedResource.maxQuantityPerStudent || 5} per student${isSchoolUniform(selectedResource) ? " per style" : ""}.` : "This item is currently out of stock."}</p>
          {isSchoolUniform(selectedResource) && <p className="request-selection-summary" aria-live="polite"><strong>{uniformStyle}</strong><span>Size: {uniformSize || "Choose a size"} · Quantity: {requestQuantity || "—"}</span></p>}
          <p className="request-dialog-note">Student Affairs will review your request. Follow its status in My Requests.</p>
          {requestError && <p className="auth-error" role="alert">{requestError}</p>}
          <div className="modal-actions"><button type="button" className="modal-secondary" onClick={() => setSelectedResource(null)} disabled={submitting}>Cancel</button><button type="submit" className="modal-primary" disabled={submitting || quantityLimit < 1}>{submitting ? "Submitting..." : "Submit request"}</button></div>
          </form>
        </> : <>
          <div className="success-icon">✓</div><h2 id="resource-request-title">Request submitted</h2><p>Your request for {selectedResource.name} is now pending review.</p>
          {isSchoolUniform(selectedResource) && <p className="request-selection-summary"><strong>{uniformStyle}</strong><span>Size {uniformSize} · Quantity {requestQuantity}</span></p>}
          {submissionWarning && <p role="status">{submissionWarning}</p>}
          <div className="modal-actions"><button className="modal-secondary" onClick={() => setSelectedResource(null)}>Done</button><Link className="modal-primary" to="/requests">View my requests</Link></div>
        </>}
      </dialog>}
    </div>
  );
}

export default Resources;
