import { useState } from "react";
import "./UniformGallery.css";

const uniforms = [
  { name: "Trojan T-shirt", image: "/trojan-transparent.png" },
  { name: "CITE Polo", image: "/cite-transparent.png" },
];

export default function UniformGallery({ compact = false }) {
  const [index, setIndex] = useState(0);
  const uniform = uniforms[index];
  const move = (offset) => setIndex((current) => (current + offset + uniforms.length) % uniforms.length);

  if (compact) {
    return (
      <div className="resource-card-gallery" role="group" aria-roledescription="carousel" aria-label="School uniform styles">
        <div className="resource-card-image uniform-card-image">
          <img src={uniform.image} alt={`${uniform.name}, front and back views`} loading="lazy" />
        </div>
        <div className="resource-card-gallery-controls">
          <button type="button" aria-label="Previous uniform" onClick={() => move(-1)}>&larr;</button>
          <div className="resource-card-gallery-position">
            <span aria-live="polite">{uniform.name}</span>
            <div className="resource-card-gallery-dots">
              {uniforms.map((item, position) => <button key={item.name} type="button" aria-label={`View ${item.name}`} aria-current={position === index ? "true" : undefined} onClick={() => setIndex(position)}><i /></button>)}
            </div>
          </div>
          <button type="button" aria-label="Next uniform" onClick={() => move(1)}>&rarr;</button>
        </div>
      </div>
    );
  }

  return (
    <div className="uniform-gallery" role="group" aria-roledescription="carousel" aria-label="School uniform styles"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}>
      <div className="uniform-gallery-heading">
        <span>Explore uniform styles</span>
        <div className="uniform-gallery-navigation">
          <button type="button" aria-label="Previous uniform" onClick={() => move(-1)}>&larr;</button>
          <span>{index + 1} / {uniforms.length}</span>
          <button type="button" aria-label="Next uniform" onClick={() => move(1)}>&rarr;</button>
        </div>
      </div>
      <figure className="uniform-gallery-item" aria-live="polite" aria-atomic="true">
        <img src={uniform.image} alt={`${uniform.name}, front and back views`} loading="lazy" width="1536" height="1024" />
        <figcaption>{uniform.name}<small>Front &amp; back view</small></figcaption>
      </figure>
      <div className="uniform-gallery-controls">
        <div className="uniform-gallery-options" role="group" aria-label="Choose uniform image">
          {uniforms.map((item, position) => (
            <button type="button" key={item.name} aria-label={`View ${item.name}`} aria-pressed={position === index} onClick={() => setIndex(position)}>
              {item.name.replace(" Uniform", "")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
