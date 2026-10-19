import { useState } from "react";

export default function AllocationIdentity({ name, avatar, studentId }) {
  const [failedSource, setFailedSource] = useState(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <div className="allocation-identity">
    <span className="allocation-avatar" aria-hidden="true">
      {avatar && failedSource !== avatar
        ? <img src={avatar} alt="" loading="lazy" decoding="async" onError={() => setFailedSource(avatar)} />
        : initials || "?"}
    </span>
    <div className="allocation-student"><strong>{name}</strong><small>Student ID: {studentId}</small></div>
  </div>;
}
