import { useState } from "react";
import "./UniformGallery.css";

const uniforms = [
  { name: "Corporate Uniform", image: "/Corporate.jpg" },
  { name: "Trojan Uniform", image: "/Trojan.jpg" },
  { name: "CITE Uniform", image: "/Cite.jpg" },
];

export default function UniformGallery() {
  const [index, setIndex] = useState(0);
  const uniform = uniforms[index];
  const move = (offset) => setIndex((current) => (current + offset + uniforms.length) % uniforms.length);

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
        <span>Uniform preview</span>
        <div className="uniform-gallery-navigation">
          <button type="button" aria-label="Previous uniform" onClick={() => move(-1)}>&larr;</button>
          <span>{index + 1} / {uniforms.length}</span>
          <button type="button" aria-label="Next uniform" onClick={() => move(1)}>&rarr;</button>
        </div>
      </div>
      <figure className="uniform-gallery-item" aria-live="polite" aria-atomic="true">
        <img src={uniform.image} alt={uniform.name} loading="lazy" />
        <figcaption>{uniform.name}</figcaption>
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
