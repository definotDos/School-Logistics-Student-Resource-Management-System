import { useRef, useState } from "react";
import "./ResourceCarousel.css";

export default function ResourceCarousel({ resources, onRequest }) {
  const [index, setIndex] = useState(0);
  const [failedImage, setFailedImage] = useState(null);
  const touchStart = useRef(null);
  if (!resources.length) return null;
  const activeIndex = Math.min(index, resources.length - 1);
  const resource = resources[activeIndex];
  const unavailable = resource.quantity < 1 || resource.status === "Discontinued";
  const move = (offset) => setIndex((activeIndex + offset + resources.length) % resources.length);

  return <section className="resource-carousel" aria-label="Explore resource images" aria-roledescription="carousel">
    <div className="resource-carousel-heading"><h2>Explore resources</h2><span>{activeIndex + 1} / {resources.length}</span></div>
    <div className="resource-carousel-slide" role="group" aria-roledescription="slide" aria-label={`${activeIndex + 1} of ${resources.length}: ${resource.name}`}>
      <div className="resource-carousel-image" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (touchStart.current !== null) { const distance = touchStart.current - event.changedTouches[0].clientX; if (Math.abs(distance) > 50) move(distance > 0 ? 1 : -1); } touchStart.current = null; }} onTouchCancel={() => { touchStart.current = null; }}>
        {resource.image && failedImage !== resource.image ? <img key={resource._id || activeIndex} src={resource.image} alt={resource.name} onError={() => setFailedImage(resource.image)} /> : <span key={resource._id || activeIndex} aria-hidden="true">{resource.icon}</span>}
      </div>
      <div className="resource-carousel-copy">
        <span className="resource-carousel-category">{resource.category}</span>
        <h3 key={resource._id || activeIndex}>{resource.name}</h3>
        <p>Browse school-provided resources and submit a request for review.</p>
        <div className="resource-carousel-stock"><span>{unavailable ? "Currently unavailable" : "Available to request"}</span><strong>{resource.quantity} <small>in stock</small></strong></div>
        <button type="button" className="resource-carousel-request" disabled={unavailable} onClick={() => onRequest(resource)} aria-label={`Request ${resource.name}`}>{unavailable ? "Unavailable" : "Request resource"}<span aria-hidden="true">&rarr;</span></button>
      </div>
    </div>
    {resources.length > 1 && <div className="resource-carousel-controls">
      <button type="button" className="resource-carousel-arrow" aria-label="Previous resource" onClick={() => move(-1)}>&larr;</button>
      <div className="resource-carousel-dots">{resources.map((item, position) => <button type="button" key={item._id} aria-label={`Show ${item.name}`} aria-current={position === activeIndex ? "true" : undefined} onClick={() => setIndex(position)}><span /></button>)}</div>
      <button type="button" className="resource-carousel-arrow" aria-label="Next resource" onClick={() => move(1)}>&rarr;</button>
    </div>}
    <span className="resource-carousel-announcement" role="status">{resource.name}, resource {activeIndex + 1} of {resources.length}</span>
  </section>;
}
