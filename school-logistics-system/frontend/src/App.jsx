import { useMemo, useState } from 'react'

import './App.css'
import { categories, initialRequests, resources } from './data/mockData'
import { Header, RequestModal, Sidebar } from './components/Layout'
import {
  RequestRow,
  ResourceCard,
  SectionHeading,
  StatCard,
} from './components/UI'
import { statusClass } from './utils/status'
import { AuthPage } from './pages/Auth/AuthPage'

function Dashboard({ requests, onNavigate, onRequest }) {
  return (
    <>
      <section className="welcome">
        <div>
          <small>STUDENT PORTAL</small>
          <h1>Good morning, Alex!</h1>
          <p>Here is what is happening with your school resources.</p>
          <button className="primary" onClick={() => onNavigate('Browse Resources')}>
            Browse Resources -&gt;
          </button>
        </div>
        <div className="art">
          <span className="sun" />
          <b>SL</b>
          <i>+</i>
          <em>*</em>
        </div>
      </section>

      <section className="stats">
        <StatCard number="3" label="Active Requests" detail="2 awaiting review" icon="#" />
        <StatCard
          number="4"
          label="Resources Assigned"
          detail="1 ready for claim"
          icon="="
          color="blue"
        />
        <StatCard
          number="1"
          label="Upcoming Claim"
          detail="October 25, 2024"
          icon="@"
          color="orange"
        />
      </section>

      <SectionHeading
        title="My Recent Requests"
        description="Keep track of your resource requests"
        action="View all requests"
        onClick={() => onNavigate('My Requests')}
      />
      <div className="rows">
        {requests.slice(0, 3).map(request => (
          <RequestRow key={request.ref} request={request} />
        ))}
      </div>

      <SectionHeading
        title="Available Resources"
        description="Resources you may be eligible to request"
        action="Browse all"
        onClick={() => onNavigate('Browse Resources')}
      />
      <div className="grid">
        {resources.slice(0, 3).map(resource => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onRequest={() => onRequest(resource)}
          />
        ))}
      </div>
    </>
  )
}

function ResourceCatalog({ query, filter, onQuery, onFilter, onRequest }) {
  const visibleResources = useMemo(
    () =>
      resources.filter(
        resource =>
          (filter === 'All Categories' || resource.type === filter) &&
          `${resource.name} ${resource.type}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, filter],
  )

  return (
    <section className="page">
      <small>RESOURCE CATALOG</small>
      <h1>Browse available resources</h1>
      <p>Find and request the school resources you need.</p>
      <div className="filters">
        <label>
          Search
          <input
            value={query}
            onChange={event => onQuery(event.target.value)}
            placeholder="Search resources"
          />
        </label>
        <select value={filter} onChange={event => onFilter(event.target.value)}>
          {categories.map(category => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>
      <div className="grid four">
        {visibleResources.map(resource => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onRequest={() => onRequest(resource)}
          />
        ))}
      </div>
    </section>
  )
}

function RequestsPage({ requests }) {
  return (
    <section className="page">
      <small>REQUEST CENTER</small>
      <h1>My requests</h1>
      <p>Track the status of every school resource you requested.</p>
      <div className="table">
        <header>
          <span>RESOURCE</span>
          <span>REFERENCE</span>
          <span>SUBMITTED</span>
          <span>STATUS</span>
        </header>
        {requests.map(request => (
          <div className="tr" key={request.ref}>
            <span>
              <i className={`tiny ${request.tone}`}>{request.icon}</i>
              {request.name}
            </span>
            <span>{request.ref}</span>
            <span>{request.date}</span>
            <strong className={`status ${statusClass(request.status)}`}>
              {request.status}
            </strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function SchedulePage() {
  return (
    <section className="page">
      <small>CLAIM SCHEDULE</small>
      <h1>Your upcoming claims</h1>
      <p>Please bring your school ID and this reference number when claiming.</p>
      <article className="schedule">
        <b className="date">
          25
          <small>OCT</small>
        </b>
        <div>
          <strong className="status ready-for-claim">Ready for Claim</strong>
          <h2>Student ID Card</h2>
          <p>Friday, October 25, 2024 | 9:00 AM-3:00 PM</p>
          <p>Student Services Office, Building A</p>
        </div>
        <button className="primary">View claim pass</button>
      </article>
    </section>
  )
}

function HistoryPage() {
  return (
    <section className="page">
      <small>DISTRIBUTION RECORDS</small>
      <h1>Distribution history</h1>
      <p>A complete record of resources successfully released to you.</p>
      <div className="empty">
        <b>OK</b>
        <h2>No completed distributions yet</h2>
        <p>Your released school resources will appear here.</p>
      </div>
    </section>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [page, setPage] = useState('Dashboard')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All Categories')
  const [selectedResource, setSelectedResource] = useState(null)
  const [newRequests, setNewRequests] = useState([])
  const [showNotices, setShowNotices] = useState(false)

  const requests = [...newRequests, ...initialRequests]
  const submitRequest = () => {
    setNewRequests([
      {
        ...selectedResource,
        ref: `REQ-2024-${160 + newRequests.length}`,
        date: 'Today',
        status: 'Pending Review',
      },
      ...newRequests,
    ])
    setSelectedResource(null)
    setPage('My Requests')
  }

  const pages = {
    Dashboard: (
      <Dashboard
        requests={requests}
        onNavigate={setPage}
        onRequest={setSelectedResource}
      />
    ),
    'Browse Resources': (
      <ResourceCatalog
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
        onRequest={setSelectedResource}
      />
    ),
    'My Requests': <RequestsPage requests={requests} />,
    'Claim Schedule': <SchedulePage />,
    'Distribution History': <HistoryPage />,
  }

  if (!isAuthenticated) {
    return <AuthPage onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={setPage} />
      <main>
        <Header
          page={page}
          showNotices={showNotices}
          onToggleNotices={() => setShowNotices(!showNotices)}
        />
        <div className="content">{pages[page]}</div>
      </main>
      <RequestModal
        resource={selectedResource}
        onCancel={() => setSelectedResource(null)}
        onConfirm={submitRequest}
      />
    </div>
  )
}

export default App
