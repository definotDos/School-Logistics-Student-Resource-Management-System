function ResourceCard({ resource, onRequest }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      <div className="flex h-32 items-center justify-center bg-slate-100 text-5xl">
        {resource.image ? <img className="h-full w-full object-cover" src={resource.image} alt={resource.name} onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.nextElementSibling.style.display = "block"; }} /> : null}
        <span style={{ display: resource.image ? "none" : "block" }}>{resource.icon}</span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">
              {resource.name}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {resource.category}
            </p>
          </div>

          <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
            Available
          </span>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Available stock:{" "}
          <span className="font-semibold text-slate-900">
            {resource.quantity}
          </span>
        </p>

        <button
          onClick={() => onRequest(resource)}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Request Resource
        </button>
      </div>
    </div>
  );
}

export default ResourceCard;