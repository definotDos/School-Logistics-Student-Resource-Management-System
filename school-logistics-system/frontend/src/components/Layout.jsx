import { navigation } from '../data/mockData'

const navIcons = ['#', '+', '=', '@', '*']

export function Sidebar({ page, onNavigate }) {
  return (
    <aside>
      <div className="logo">
        <b>S</b>School<span>Logistics</span>
      </div>

      <div className="school">
        RN
        <div>
          <b>Rizal National High School</b>
          <small>Main Campus</small>
        </div>
        v
      </div>

      <nav>
        {navigation.map((item, index) => (
          <button
            className={page === item ? 'active' : ''}
            onClick={() => onNavigate(item)}
            key={item}
          >
            <i>{navIcons[index]}</i>
            {item}
            {item === 'My Requests' && <em>2</em>}
          </button>
        ))}
      </nav>

      <div className="aside-bottom">
        ? Help and Support
        <br />
        Settings
        <div className="user">
          <b>AM</b>
          <span>
            Alex Morgan
            <small>Grade 11 | STEM</small>
          </span>
        </div>
      </div>
    </aside>
  )
}

export function Header({ page, showNotices, onToggleNotices }) {
  return (
    <header>
      <div>
        <b>{page}</b>
        {page === 'Dashboard' && <small>Welcome back, Alex</small>}
      </div>

      <div>
        <button className="bell" onClick={onToggleNotices}>
          N<i />
        </button>
        <b className="profile">AM</b> Alex Morgan
      </div>

      {showNotices && (
        <section className="notice">
          <b>Notifications</b>
          <p>Learning Module Pack was approved.</p>
          <p>Student ID Card is ready for claim.</p>
        </section>
      )}
    </header>
  )
}

export function RequestModal({ resource, onCancel, onConfirm }) {
  if (!resource) return null

  return (
    <div className="shade">
      <section className="modal">
        <button onClick={onCancel}>x</button>
        <div className={`icon ${resource.tone}`}>{resource.icon}</div>
        <h2>Request {resource.name}?</h2>
        <p>
          Submit a request for this resource. Your eligibility will be reviewed
          by Student Affairs.
        </p>
        <footer>
          <button onClick={onCancel} className="cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="primary">
            Submit Request
          </button>
        </footer>
      </section>
    </div>
  )
}
