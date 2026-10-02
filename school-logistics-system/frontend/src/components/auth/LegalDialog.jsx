import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './LegalDialog.css'

const documents = {
  terms: {
    title: 'Terms of Service',
    intro: 'Guidelines for using the School Logistics System to request and manage campus resources.',
    sections: [
      ['Your account', 'Use accurate account information and your own student or employee ID. Keep your password and verification codes private. Contact your campus administrator if you suspect someone else is using your account.'],
      ['Responsible use', 'Use the system for school resource requests and related campus activities. Do not impersonate another person, submit misleading requests, or attempt to access accounts or records without permission.'],
      ['Resource requests', 'Submitting a request does not guarantee approval or availability. Review your request status and follow the instructions provided by campus staff for collection, use, and return.'],
      ['Care of school resources', 'Use resources responsibly, follow campus rules, and report missing or damaged items to the staff responsible for the resource.'],
      ['Questions and assistance', 'Contact your campus administrator for help with account access, requests, or the rules that apply to your school.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'An overview of the information used to provide account access and campus resource services.',
    sections: [
      ['Account information', 'The signup form asks for your name, school email, student or employee ID, account type, campus, and password. Email verification is part of account registration.'],
      ['Requests and activity', 'Information you submit through resource requests is used to process and track those requests. Keep your submissions relevant and avoid including unnecessary personal information.'],
      ['Browser storage', 'The application uses browser session storage for sign-in information and the email address used during verification. On a shared device, sign out when you finish.'],
      ['Campus administration', 'Campus staff use the system to manage resources and requests. Ask your campus administrator about access to your records and the school’s information handling practices.'],
      ['Privacy questions', 'Contact your school for its official privacy notice, including retention periods, service providers, and procedures for requesting access, correction, or deletion of personal information.'],
    ],
  },
}

export function LegalDialog({ document, onClose }) {
  const dialogRef = useRef(null)
  const content = documents[document]

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = window.document.activeElement
    const previousOverflow = window.document.body.style.overflow
    dialog.showModal()
    window.document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      window.document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return createPortal(
    <dialog ref={dialogRef} className="signup-legal-dialog" aria-labelledby="signup-legal-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="signup-legal-content">
        <header className="signup-legal-header">
          <div><p>School Logistics System <span className="signup-legal-badge">Account &amp; services</span></p><h2 id="signup-legal-title" tabIndex={-1} autoFocus>{content.title}</h2></div>
          <button type="button" className="signup-legal-close" onClick={onClose} aria-label={`Close ${content.title}`}>×</button>
        </header>
        <div className="signup-legal-body">
          <div className="signup-legal-draft" role="note"><strong>Draft for school review</strong><p>Your school’s official policies should be provided before this notice is published.</p></div>
          <p className="signup-legal-intro">{content.intro}</p>
          <nav className="signup-legal-nav" aria-label={`${content.title} sections`}>
            <p>In this document</p>
            <div>{content.sections.map(([heading], index) => <button type="button" key={heading} onClick={() => { const section = window.document.getElementById(`legal-section-${index}`); section?.scrollIntoView({ block: 'start', behavior: 'instant' }); section?.focus({ preventScroll: true }) }}>{heading}<span aria-hidden="true">↗</span></button>)}</div>
          </nav>
          <div className="signup-legal-sections">{content.sections.map(([heading, text], index) => <section key={heading} id={`legal-section-${index}`} tabIndex={-1}><span className="signup-legal-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{heading}</h3><p>{text}</p></div></section>)}</div>
        </div>
        <footer className="signup-legal-footer"><p>Review at your own pace.<span>Your signup details stay in this form.</span></p><button type="button" onClick={onClose}>Back to sign up <span aria-hidden="true">→</span></button></footer>
      </div>
    </dialog>,
    window.document.body,
  )
}
