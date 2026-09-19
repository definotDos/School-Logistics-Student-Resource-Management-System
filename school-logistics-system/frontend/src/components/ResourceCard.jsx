import { useState } from "react";

function ResourceCard({ resource, onRequest }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  const images = [...new Set([resource.image, ...(Array.isArray(resource.images) ? resource.images : [])].filter((src) => typeof src === "string" && src && !failedImages.includes(src)))];
  const slides = images.length === 1 ? [{ src: images[0], label: "Full view" }, { src: images[0], label: "Close-up", detail: true }] : images.map((src, index) => ({ src, label: `Image ${index + 1}` }));
  const activeIndex = slides.length ? slideIndex % slides.length : 0;
  const slide = slides[activeIndex];
  const move = (offset) => setSlideIndex((activeIndex + offset + slides.length) % slides.length);
  const unavailable = resource.quantity < 1 || resource.status === "Discontinued";
  return (
    <div className="resource-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      <div className="resource-card-gallery" role="group" aria-roledescription="carousel" aria-label={`${resource.name} images`}>
        <div className={`resource-card-image flex h-32 items-center justify-center bg-slate-100 text-5xl ${slide?.detail ? "is-detail" : ""}`}>
          {slide ? <img className="h-full w-full object-cover" src={slide.src} alt={`${resource.name} — ${slide.label}`} loading="lazy" onError={() => setFailedImages((current) => [...current, slide.src])} /> : <span aria-hidden="true">{resource.icon}</span>}
        </div>
        {slides.length > 1 && <div className="resource-card-gallery-controls">
          <button type="button" aria-label={`Previous image of ${resource.name}`} onClick={() => move(-1)}>&larr;</button>
          <div className="resource-card-gallery-position"><span aria-live="polite">{slide.label}</span><div className="resource-card-gallery-dots">{slides.map((item, index) => <button key={`${item.src}-${index}`} type="button" aria-label={`${resource.name}: ${item.label}`} aria-current={index === activeIndex ? "true" : undefined} onClick={() => setSlideIndex(index)}><i /></button>)}</div></div>
          <button type="button" aria-label={`Next image of ${resource.name}`} onClick={() => move(1)}>&rarr;</button>
        </div>}
      </div>

      <div className="resource-card-body p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">
              {resource.name}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {resource.category}
            </p>
          </div>

          <span className={`resource-card-status rounded-md px-2 py-1 text-xs font-medium ${unavailable ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700"}`}>
            {resource.status === "Discontinued" ? "Discontinued" : resource.quantity > 0 ? "Available" : "Out of stock"}
          </span>
        </div>

        <p className="resource-card-stock mt-4 text-sm text-slate-600">
          <span>Available stock</span>
          <span className="font-semibold text-slate-900">
            {resource.quantity}
          </span>
        </p>

        <button
          type="button"
          disabled={unavailable}
          aria-label={`Request ${resource.name}`}
          onClick={() => onRequest(resource)}
          className="resource-card-request"
        >
          {unavailable ? "Currently unavailable" : "Request resource"}
          {!unavailable && <span aria-hidden="true">&rarr;</span>}
        </button>
      </div>
    </div>
  );
}

export default ResourceCard;
