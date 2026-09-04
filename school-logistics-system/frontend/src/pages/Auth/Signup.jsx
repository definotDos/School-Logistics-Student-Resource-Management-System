import { useRef, useState } from 'react'
import { campuses } from '../../data/campuses'

export function SignupPage({
  onSignup,
  onCampusChange,
  onChangeMode,
  error,
  isSubmitting = false,
  onVerifyEmail,
  onResendVerificationCode,
}) {
  const [form, setForm] = useState({ name: '', email: '', studentId: '', password: '', role: 'student', campus: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [campusMenuOpen, setCampusMenuOpen] = useState(false)
  const [customCampuses, setCustomCampuses] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('srmsCustomCampuses') || '[]')
      const cleaned = saved.filter(campus => campus.name.toLowerCase() !== 'psu bayambang')
      localStorage.setItem('srmsCustomCampuses', JSON.stringify(cleaned))
      return cleaned
    } catch { return [] }
  })
  const [addCampusOpen, setAddCampusOpen] = useState(false)
  const [newCampusName, setNewCampusName] = useState('')
  const [campusError, setCampusError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationMessage, setVerificationMessage] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('idle')
  const verificationInputs = useRef([])
  const availableCampuses = [...campuses, ...customCampuses]
  const selectedCampus = availableCampuses.find(campus => campus.name === form.campus)
  const update = key => event => {
    setForm({ ...form, [key]: event.target.value })
    setValidationErrors(current => ({ ...current, [key]: '' }))
  }
  const identityLabel = form.role === 'student' ? 'Student ID' : form.role === 'admin' ? 'Admin ID' : 'Employee ID'

  const submit = async event => {
    event.preventDefault()
    if (isSubmitting || !form.campus) return
    const errors = {}
    if (form.name.trim().length < 2) errors.name = 'Enter your full name.'
    if (form.studentId.trim().length < 2) errors.studentId = `Enter your ${identityLabel.toLowerCase()}.`
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid school email address.'
    if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    if (Object.keys(errors).length) return setValidationErrors(errors)
    setValidationErrors({})
    try {
      const result = await onSignup(form)
      if (result?.requiresVerification) setVerificationEmail(result.email || form.email.trim().toLowerCase())
    } catch {
      // handled upstream
    }
  }

  const submitVerification = async event => {
    event.preventDefault()
    if (!verificationEmail || verificationCode.trim().length !== 6 || isVerifying) return
    setIsVerifying(true)
    setVerificationStatus('verifying')
    setVerificationError('')
    setVerificationMessage('')
    try {
      await onVerifyEmail(verificationEmail, verificationCode)
      setVerificationStatus('success')
      await new Promise(resolve => setTimeout(resolve, 750))
      onChangeMode('login')
    } catch (verificationSubmitError) {
      setVerificationStatus('error')
      setVerificationError(verificationSubmitError.message)
    } finally {
      setIsVerifying(false)
    }
  }

  const updateVerificationDigit = (index, value) => {
    const digits = verificationCode.split('')
    digits[index] = value.slice(-1)
    const nextCode = digits.join('').slice(0, 6)
    setVerificationCode(nextCode)
    if (value && index < 5) verificationInputs.current[index + 1]?.focus()
  }

  const handleVerificationKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !verificationCode[index] && index > 0) verificationInputs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) verificationInputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < 5) verificationInputs.current[index + 1]?.focus()
  }

  const handleVerificationPaste = event => {
    event.preventDefault()
    const pastedCode = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    setVerificationCode(pastedCode)
    verificationInputs.current[Math.min(pastedCode.length, 5)]?.focus()
  }

  const resendCode = async () => {
    setVerificationError('')
    setVerificationMessage('')
    try {
      const result = await onResendVerificationCode(verificationEmail)
      setVerificationMessage(result.message)
    } catch (resendError) {
      setVerificationError(resendError.message)
    }
  }

  if (verificationEmail) return (
    <div className="auth-form-wrap verification-wrap">
      <div className="auth-heading">
        <h2>Check your email</h2>
        <p>We sent a 6-digit verification code to {verificationEmail}.</p>
      </div>
      <form className="auth-form" onSubmit={submitVerification}>
        <label className="auth-field form-wide">
          <span>Verification code</span>
          <div className={`verification-code-inputs verification-${verificationStatus}`} role="group" aria-label="6-digit verification code" onPaste={handleVerificationPaste}>
            {Array.from({ length: 6 }, (_, index) => (
              <input
                key={index}
                ref={element => { verificationInputs.current[index] = element }}
                className={verificationCode[index] ? 'filled' : ''}
                value={verificationCode[index] || ''}
                onChange={event => updateVerificationDigit(index, event.target.value.replace(/\D/g, ''))}
                onKeyDown={event => handleVerificationKeyDown(index, event)}
                disabled={isVerifying}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                aria-label={`Verification digit ${index + 1}`}
                required
              />
            ))}
          </div>
        </label>
        <button className={`auth-submit form-wide verification-submit verification-${verificationStatus}`} type="submit" disabled={isVerifying}>{verificationStatus === 'success' ? 'Email verified' : isVerifying ? 'Checking code...' : 'Verify email'}</button>
        {verificationError && <p className="auth-error form-wide" role="alert">{verificationError}</p>}
        {verificationMessage && <p className="auth-success form-wide" role="status">{verificationMessage}</p>}
      </form>
      <p className="auth-footer">Didn&apos;t receive it? <button type="button" onClick={resendCode}>Resend code</button></p>
    </div>
  )

  const addCampus = event => {
    event.preventDefault()
    const name = newCampusName.trim()
    if (!name) return setCampusError('Enter a campus name.')
    if (availableCampuses.some(campus => campus.name.toLowerCase() === name.toLowerCase())) return setCampusError('This campus is already listed.')
    const campus = { name, shortName: name, code: name.split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase() }
    const updatedCampuses = [...customCampuses, campus]
    setCustomCampuses(updatedCampuses)
    localStorage.setItem('srmsCustomCampuses', JSON.stringify(updatedCampuses))
    setForm(current => ({ ...current, campus: name }))
    onCampusChange(campus)
    setNewCampusName('')
    setCampusError('')
    setAddCampusOpen(false)
    setCampusMenuOpen(false)
  }

  return (
    <div className="auth-form-wrap signup-form-wrap" style={{ '--selected-campus-logo': selectedCampus?.logo ? `url("${selectedCampus.logo}")` : 'none' }}>
      <div className="auth-heading">
        <h2>Create account</h2>
      </div>
      <form className="auth-form signup-form" onSubmit={submit}>
        <fieldset className="account-type form-wide">
          <legend>Choose account type</legend>
          <div className="account-type-options">
            <label className={form.role === 'student' ? 'selected' : ''}>
              <input type="radio" name="role" value="student" checked={form.role === 'student'} onChange={update('role')} />
              <span className="account-type-icon">♙</span><span>Student<small>Request school resources</small></span>
            </label>
            <label className={form.role === 'admin' ? 'selected' : ''}>
              <input type="radio" name="role" value="admin" checked={form.role === 'admin'} onChange={update('role')} />
              <span className="account-type-icon">♙</span><span>Admin<small>Manage the system</small></span>
            </label>
            <label className={form.role === 'staff' ? 'selected' : ''}>
              <input type="radio" name="role" value="staff" checked={form.role === 'staff'} onChange={update('role')} />
              <span className="account-type-icon">◎</span><span>Staff/Services<small>Support operations</small><small>And Manage Distribution</small></span>
            </label>
          </div>
        </fieldset>
        <label className="auth-field compact-field form-wide signup-campus-field">
          <span>Campus</span>
          <button className="signup-campus-select" type="button" aria-label={selectedCampus ? `Selected campus: ${selectedCampus.name}` : 'Please select your campus'} aria-haspopup="listbox" aria-expanded={campusMenuOpen} onClick={() => setCampusMenuOpen(open => !open)}>
            {selectedCampus && (selectedCampus.logo ? <img src={selectedCampus.logo} alt="" /> : <i>{selectedCampus.code}</i>)}
            <span>{selectedCampus ? selectedCampus.name : 'Please Select Your Campus'}</span><b aria-hidden="true">⌄</b>
          </button>
          {campusMenuOpen && <div className="signup-campus-menu" role="listbox" aria-label="Choose campus">{availableCampuses.map(campus => <button className={campus.name === form.campus ? 'selected' : ''} type="button" role="option" aria-selected={campus.name === form.campus} key={campus.name} onClick={() => { setForm(current => ({ ...current, campus: campus.name })); localStorage.setItem('srmsCampus', campus.name); onCampusChange(campus); setCampusMenuOpen(false) }}>{campus.logo ? <img src={campus.logo} alt="" /> : <i>{campus.code}</i>}<span><b>{campus.name}</b><small>{campus.name === form.campus ? 'Selected campus' : 'Campus'}</small></span>{campus.name === form.campus && <strong aria-hidden="true">✓</strong>}</button>)}<button className="signup-other-campus" type="button" onClick={() => { setAddCampusOpen(true); setCampusError('') }}><i>+</i><span><b>Add other campus</b><small>Create a campus option</small></span></button></div>}
        </label>
        {addCampusOpen && <form className="signup-add-campus form-wide" onSubmit={addCampus}><div className="signup-add-campus-heading"><b>Add other campus</b><button type="button" onClick={() => { setAddCampusOpen(false); setCampusError('') }}>Cancel</button></div><div className="signup-add-campus-fields"><input value={newCampusName} onChange={event => { setNewCampusName(event.target.value); setCampusError('') }} placeholder="Campus name" aria-label="New campus name" autoFocus /><button type="submit" className="signup-add-submit">Add campus</button></div>{campusError && <small className="signup-campus-error">{campusError}</small>}</form>}
        <label className="auth-field compact-field">
          <span>Full name</span>
          <input className={validationErrors.name ? 'input-invalid' : ''} placeholder="FullName" value={form.name} onChange={update('name')} autoComplete="name" required aria-invalid={Boolean(validationErrors.name)} />
          {validationErrors.name && <small className="field-error">{validationErrors.name}</small>}
        </label>
        <label className="auth-field compact-field">
          <span>{identityLabel}</span>
          <input className={validationErrors.studentId ? 'input-invalid' : ''} placeholder={identityLabel} value={form.studentId} onChange={update('studentId')} required aria-invalid={Boolean(validationErrors.studentId)} />
          {validationErrors.studentId && <small className="field-error">{validationErrors.studentId}</small>}
        </label>
        <label className="auth-field compact-field form-wide">
          <span>School email</span>
          <input className={validationErrors.email ? 'input-invalid' : ''} type="email" placeholder="School Email" value={form.email} onChange={update('email')} autoComplete="email" required aria-invalid={Boolean(validationErrors.email)} />
          {validationErrors.email && <small className="field-error">{validationErrors.email}</small>}
        </label>
        <label className="auth-field compact-field form-wide">
          <span>Password</span>
          <span className="password-control">
            <input className={validationErrors.password ? 'input-invalid' : ''} type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={form.password} onChange={update('password')} autoComplete="new-password" required aria-invalid={Boolean(validationErrors.password)} />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
              {showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.9 10.9 0 0 1 12 4c5.4 0 9.2 5.1 9.8 6-.3.5-1.5 2.2-3.4 3.6M6.2 6.2C3.8 7.8 2.4 10.2 2.2 10.6c.6.9 4.4 5.4 9.8 5.4 1.3 0 2.5-.3 3.6-.8" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12S5.8 5 12 5s9.8 7 9.8 7-3.6 7-9.8 7-9.8-7-9.8-7Z" /><circle cx="12" cy="12" r="2.7" /></svg>}
            </button>
          </span>
          {validationErrors.password && <small className="field-error">{validationErrors.password}</small>}
        </label>
        <label className="terms form-wide"><input type="checkbox" required /> <span>I agree to the <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button>.</span></label>
        <button className="auth-submit form-wide" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Sign Up'}</button>
        {error && <p className="auth-error form-wide" role="alert">{error}</p>}
      </form>
      <p className="auth-footer">Already have an account? <button type="button" onClick={() => onChangeMode('login')}>Login</button></p>
    </div>
  )
}
