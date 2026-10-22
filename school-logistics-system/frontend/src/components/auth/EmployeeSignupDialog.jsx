import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import DashboardIcon from '../DashboardIcon'
import './EmployeeSignupDialog.css'

export default function EmployeeSignupDialog({ onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previousFocus?.focus()
    }
  }, [])
  return (
    <dialog ref={ref} className="employee-signup-dialog" aria-labelledby="employee-signup-title" aria-describedby="employee-signup-description" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="employee-signup-content">
        <button type="button" className="employee-signup-close" onClick={onClose} aria-label="Close preview options">&times;</button>
        <img src="/logo-transparent.png" width="72" height="72" alt="" />
        <p className="employee-signup-eyebrow">School Logistics System</p>
        <h2 id="employee-signup-title">Explore the dashboards</h2>
        <p id="employee-signup-description" className="employee-signup-description">Choose a workspace to preview its layout and tools. Private details stay hidden.</p>
        <div className="employee-signup-options">
          <Link to="/preview/admin"><strong><DashboardIcon name="audit" />Admin Preview <span aria-hidden="true">&rarr;</span></strong><span>Explore users, requests, allocation, and reports.</span><small>View the layout without accessing private records.</small></Link>
          <Link to="/preview/staff"><strong><DashboardIcon name="distribution" />Staff Preview <span aria-hidden="true">&rarr;</span></strong><span>Explore request reviews, claims, and distribution.</span><small>View the workflow without accessing student details.</small></Link>
        </div>
        <p className="employee-signup-footer">Preview only &middot; No sign-in required<br />Have an account? <Link to="/login">Log in</Link></p>
      </div>
    </dialog>
  )
}
