import { useState } from "react";
import { getResourceImage } from "../utils/resourceImages";
import { getUniformStyleImage } from "../utils/uniforms";
import DashboardIcon from "./DashboardIcon";

export default function RequestResourceImage({ request }) {
  const [failed, setFailed] = useState(null);
  const name = request.resourceName || request.resource || "Resource";
  const src = getUniformStyleImage(request.uniformStyle) || getResourceImage({ name, image: request.resourceImage });
  return <span className="request-resource-image">
    {src && failed !== src ? <img src={src} alt={request.uniformStyle ? `${name}: ${request.uniformStyle}` : name} loading="lazy" onError={() => setFailed(src)} /> : <DashboardIcon name="resources" />}
  </span>;
}
