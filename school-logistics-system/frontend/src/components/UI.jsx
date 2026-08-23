import { statusClass } from '../utils/status'

export function ResourceCard({ resource, onRequest }) {
  return (
    <article className="card">
      <div className={`icon ${resource.tone}`}>{resource.icon}</div>
      <small className="tag">{resource.type}</small>
      <h3>{resource.name}</h3>
      <p>{resource.desc}</p>
      <footer>
        <b className={resource.stock === 'Limited' ? 'limited' : ''}>
          Available: {resource.stock}
        </b>
        <button onClick={onRequest}>Request -&gt;</button>
      </footer>
    </article>
  )
}

export function RequestRow({ request }) {
  return (
    <article className="row">
      <div className={`icon ${request.tone}`}>{request.icon}</div>
      <div>
        <b>{request.name}</b>
        <small>
          {request.ref} | Submitted {request.date}
        </small>
      </div>
      <strong className={`status ${statusClass(request.status)}`}>
        {request.status}
      </strong>
      <i>&gt;</i>
    </article>
  )
}

export function SectionHeading({ title, description, action, onClick }) {
  return (
    <div className="heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && <button onClick={onClick}>{action} -&gt;</button>}
    </div>
  )
}

export function StatCard({ number, label, detail, icon, color = '' }) {
  return (
    <article className="stat">
      <b className={color}>{icon}</b>
      <div>
        <strong>{number}</strong>
        <h3>{label}</h3>
        <small>{detail}</small>
      </div>
    </article>
  )
}
