import { useState } from "react";
import RequestResourceImage from "./RequestResourceImage";
import { getUniformStyleImage, isSchoolUniform } from "../utils/uniforms";

function UniformPreview({ style }) {
  const [failed, setFailed] = useState(false);
  return <span className="allocation-uniform-preview" title={style}>
    {failed ? <small>{style}</small> : <img src={getUniformStyleImage(style)} alt={style} loading="lazy" decoding="async" onError={() => setFailed(true)} />}
  </span>;
}

export default function AllocationResource({ row }) {
  const catalogPreview = isSchoolUniform({ name: row.resourceName }) && !row.uniformStyle && (!row.resourceImage || row.resourceImage === "/school-uniform.svg");
  return <div className="allocation-resource">
    {catalogPreview ? <div className="allocation-uniform-options" aria-label="Uniform catalog preview">
      <UniformPreview style="Trojan T-shirt" />
      <UniformPreview style="CITE Polo" />
    </div> : <RequestResourceImage request={row} />}
    <div className="allocation-resource-copy">
      <strong>{row.resourceName}</strong>
      {catalogPreview && <small>Catalog preview · Style not recorded</small>}
      {(row.uniformStyle || row.uniformSize) && <small>{[row.uniformStyle, row.uniformSize && `Size ${row.uniformSize}`].filter(Boolean).join(" · ")}</small>}
    </div>
  </div>;
}
