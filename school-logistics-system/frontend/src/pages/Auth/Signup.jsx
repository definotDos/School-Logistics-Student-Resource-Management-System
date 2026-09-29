import { idType, validateAccount } from '../../utils/accountValidation'
import { useEffect, useRef, useState } from 'react'
import { authAPI, campusAPI } from '../../services/api'
import { campuses as campusDirectory } from '../../data/campuses'
import { AuthLoadingButton } from '../../components/auth/AuthLoadingButton'
import './Signup.css'

export function SignupPage({
  onSignup,
  onChangeMode,
  error,
  isSubmitting = false,
  onVerifyEmail,
  onResendVerificationCode,
}) {
  const [form, setForm] = useState({ name: '', email: '', studentId: '', password: '', role: 'student', campus: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [employeeIdChecked, setEmployeeIdChecked] = useState(false)
  const [isCheckingId, setIsCheckingId] = useState(false)
  const [employeeIdError, setEmployeeIdError] = useState('')
  const detailsHeading = useRef(null)
  useEffect(() => {
    if (employeeIdChecked) detailsHeading.current?.focus()
  }, [employeeIdChecked])
  const changeAccountType = role => {
    setForm(current => ({ ...current, role, studentId: '', password: '' }))
    setEmployeeIdChecked(false)
    setEmployeeIdError('')
    setValidationErrors({})
    setCampusMenuOpen(false)
  }
  const checkEmployeeId = async event => {
    event.preventDefault()
    if (isCheckingId) return
    if (idType(form.studentId) !== 'employee') {
      setEmployeeIdError('Enter an employee ID in the format EMP-123456.')
      return
    }
    setIsCheckingId(true)
    setEmployeeIdError('')
    try {
      const result = await authAPI.checkEmployeeId(form.studentId)
      setForm(current => ({ ...current, studentId: result.studentId }))
      setEmployeeIdChecked(true)
    } catch (checkError) {
      setEmployeeIdError(checkError.message)
    } finally {
      setIsCheckingId(false)
    }
  }
  const [campusMenuOpen, setCampusMenuOpen] = useState(false)
  const [availableCampuses, setAvailableCampuses] = useState([])
  const [campusError, setCampusError] = useState('')
  useEffect(() => { campusAPI.getPublic().then(r => setAvailableCampuses(r.campuses)).catch(e => setCampusError(e.message)) }, [])
  const [validationErrors, setValidationErrors] = useState({})
  const [verificationEmail, setVerificationEmail] = useState(() => sessionStorage.getItem('srmsVerificationEmail') || '')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationMessage, setVerificationMessage] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('idle')
  const verificationHeading = useRef(null)
  useEffect(() => {
    if (verificationEmail) {
      verificationHeading.current?.focus({ preventScroll: true })
      verificationHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
  }, [verificationEmail])
  const selectedCampusRecord = availableCampuses.find(campus => campus.name === form.campus)
  const selectedCampus = selectedCampusRecord && {
    ...campusDirectory.find(campus => campus.name === selectedCampusRecord.name),
    ...selectedCampusRecord,
  }
  const update = key => event => {
    setForm({ ...form, [key]: event.target.value })
    setValidationErrors(current => ({ ...current, [key]: '' }))
  }
  const identityLabel = form.role === 'student' ? 'Student ID' : 'Employee ID'

  const submit = async event => {
    event.preventDefault()
    if (isSubmitting) return
    if (form.role === 'staff' && !employeeIdChecked) return
    const errors = validateAccount(form)
    if (Object.keys(errors).length) return setValidationErrors(errors)
    setValidationErrors({})
    try {
      const result = await onSignup(form)
      if (result?.requiresVerification) setForm(current => ({ ...current, password: '' }))
      if (result?.requiresVerification) { const email = result.email || form.email.trim().toLowerCase(); sessionStorage.setItem('srmsVerificationEmail', email); setVerificationEmail(email) }
    } catch {
      // handled upstream
    }
  }

  const submitVerification = async event => {
    event.preventDefault()
    if (!verificationEmail || !/^\d{6}$/.test(verificationCode) || isVerifying || isResending) return
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

  const updateVerificationCode = value => {
    setVerificationCode(value.replace(/\D/g, '').slice(0, 6))
    setVerificationError('')
    setVerificationStatus('idle')
  }

  const handleVerificationPaste = event => {
    event.preventDefault()
    updateVerificationCode(event.clipboardData.getData('text'))
  }

  const resendCode = async () => {
    if (isResending || isVerifying) return
    setIsResending(true)
    setVerificationStatus('idle')
    setVerificationError('')
    setVerificationMessage('')
    try {
      const result = await onResendVerificationCode(verificationEmail)
      setVerificationMessage(result.message)
    } catch (resendError) {
      setVerificationError(resendError.message)
    } finally {
      setIsResending(false)
    }
  }

  if (verificationEmail) return (
    <div className="auth-form-wrap verification-wrap">
      <div className="auth-heading">
        <h2 ref={verificationHeading} tabIndex={-1}>Check your email</h2>
        <p>Enter the 6-digit verification code sent to</p>
        <strong className="verification-email">{verificationEmail}</strong>
      </div>
      <form className="auth-form" onSubmit={submitVerification} aria-busy={isVerifying || isResending}>
        <div className="auth-field form-wide verification-field">
          <label htmlFor="signup-verification-code">Verification code</label>
              <input
                id="signup-verification-code"
                name="verificationCode"
                className="verification-code-entry"
                type="text"
                value={verificationCode}
                onChange={event => updateVerificationCode(event.target.value)}
                onPaste={handleVerificationPaste}
                disabled={isVerifying || isResending}
                inputMode="numeric"
                autoComplete="one-time-code"
                enterKeyHint="done"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                aria-invalid={verificationStatus === 'error'}
                aria-describedby={`verification-code-help${verificationError ? ' verification-error' : ''}`}
                required
              />
          <small id="verification-code-help">Type or paste the 6-digit code from your email.</small>
        </div>
        {verificationError && <p id="verification-error" className="auth-error form-wide" role="alert">{verificationError}</p>}
        {verificationMessage && <p className="auth-success form-wide" role="status">{verificationMessage}</p>}
        <AuthLoadingButton className={`auth-submit form-wide verification-submit verification-${verificationStatus}`} loading={isVerifying && verificationStatus !== 'success'} success={verificationStatus === 'success'} loadingText="Checking code..." disabled={isVerifying || isResending}>{verificationStatus === 'success' ? 'Email verified' : 'Verify email'}</AuthLoadingButton>
      </form>
      <div className="verification-actions">
      <p className="auth-footer">Didn&apos;t receive it? <AuthLoadingButton type="button" onClick={resendCode} loading={isResending} loadingText="Sending code..." disabled={isVerifying}>Resend code</AuthLoadingButton></p>
      <p className="auth-footer"><button type="button" disabled={isVerifying || isResending} onClick={() => { sessionStorage.removeItem('srmsVerificationEmail'); setVerificationEmail(''); onChangeMode('login') }}>Back to login</button></p>
      </div>
    </div>
  )

  return (
    <div className="auth-form-wrap signup-form-wrap" style={{ '--selected-campus-logo': selectedCampus?.logo ? `url("${selectedCampus.logo}")` : 'none' }}>
      <div className="auth-heading">
        {campusError && <p role="alert">{campusError}</p>}
        <h2 ref={detailsHeading} tabIndex={-1}>Create account</h2>
        <p>Join your campus. Get the resources you need.</p>
      </div>
      <fieldset className="signup-role-picker" disabled={isCheckingId || isSubmitting}>
        <legend>Account type</legend>
        <div>
          {[['student', 'Student'], ['staff', 'Staff / Employee']].map(([role, label]) => (
            <label key={role} className={form.role === role ? 'selected' : ''}>
              <input type="radio" name="signup-role" value={role} checked={form.role === role} onChange={() => changeAccountType(role)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {form.role === 'staff' && <ol className="signup-steps" aria-label="Staff signup progress">
        <li aria-current={!employeeIdChecked ? 'step' : undefined}>1. Employee ID</li>
        <li aria-current={employeeIdChecked ? 'step' : undefined}>2. Account details</li>
        <li>3. Verify email</li>
      </ol>}
      {form.role === 'staff' && !employeeIdChecked ? (
        <form className="auth-form signup-form" onSubmit={checkEmployeeId} aria-busy={isCheckingId}>
          <p className="signup-id-help form-wide">Enter your employee ID to continue to the staff signup form.</p>
          <label className="auth-field compact-field form-wide">
            <span>Employee ID</span>
            <input value={form.studentId} onChange={event => { update('studentId')(event); setEmployeeIdError('') }} placeholder="EMP-123456" maxLength={10} required disabled={isCheckingId} autoCapitalize="characters" spellCheck={false} aria-invalid={Boolean(employeeIdError)} aria-describedby="employee-id-help" />
            <small id="employee-id-help" className="signup-field-hint">Use the format EMP-123456. Your ID must not already be registered.</small>
          </label>
          {employeeIdError && <p className="auth-error form-wide" role="alert">{employeeIdError}</p>}
          <AuthLoadingButton className="auth-submit form-wide" loading={isCheckingId} loadingText="Checking employee ID...">Continue</AuthLoadingButton>
        </form>
      ) : (
      <form className="auth-form signup-form" onSubmit={submit} aria-busy={isSubmitting}>
        {form.role === 'staff' && <div className="signup-id-summary form-wide"><span>Employee ID: <strong>{form.studentId}</strong></span><button type="button" disabled={isSubmitting} onClick={() => { setEmployeeIdChecked(false); setEmployeeIdError(''); setForm(current => ({ ...current, password: '' })) }}>Change ID</button></div>}
        {error && <p className="auth-error form-wide" role="alert">{error}</p>}
        <label className="auth-field compact-field form-wide signup-campus-field">
          <span>Campus</span>
          <button className="signup-campus-select" type="button" aria-label={selectedCampus ? `Selected campus: ${selectedCampus.name}` : 'Please select your campus'} aria-haspopup="listbox" aria-expanded={campusMenuOpen} onClick={() => setCampusMenuOpen(open => !open)}>
            {selectedCampus && (selectedCampus.logo ? <img src={selectedCampus.logo} alt="" /> : <i>{selectedCampus.code}</i>)}
            <span>{selectedCampus ? selectedCampus.name : 'Please Select Your Campus'}</span><b aria-hidden="true">⌄</b>
          </button>
          {validationErrors.campus && <small className="field-error">{validationErrors.campus}</small>}
        </label>
        {campusMenuOpen && <div className="signup-campus-menu form-wide" role="listbox" aria-label="Available campuses">{availableCampuses.map(campus => { const campusDetails = { ...campusDirectory.find(entry => entry.name === campus.name), ...campus }; return <button key={campus._id} type="button" role="option" aria-selected={form.campus === campus.name} onClick={() => { setForm({ ...form, campus: campus.name }); setCampusMenuOpen(false); }}>{campusDetails.logo ? <img src={campusDetails.logo} alt="" /> : <i>{campusDetails.code || campus.name.slice(0, 2).toUpperCase()}</i>}<span>{campus.name}</span></button> })}{!availableCampuses.length && <p>No active campuses. Contact an administrator.</p>}</div>}
        <label className="auth-field compact-field">
          <span>Full name</span>
          <input className={validationErrors.name ? 'input-invalid' : ''} placeholder="Full name" value={form.name} onChange={update('name')} autoComplete="name" required aria-invalid={Boolean(validationErrors.name)} />
          {validationErrors.name && <small className="field-error">{validationErrors.name}</small>}
        </label>
        <label className="auth-field compact-field">
          <span>{identityLabel}</span>
          <input className={validationErrors.studentId ? 'input-invalid' : ''} placeholder={identityLabel} maxLength={16} value={form.studentId} onChange={update('studentId')} readOnly={form.role === 'staff'} required aria-invalid={Boolean(validationErrors.studentId)} />
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
          <small className="signup-field-hint">Use at least 8 characters.</small>
          {validationErrors.password && <small className="field-error">{validationErrors.password}</small>}
        </label>
        <label className="terms form-wide"><input type="checkbox" required /> <span>I agree to the <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button>.</span></label>
        <AuthLoadingButton className="auth-submit form-wide" loading={isSubmitting} loadingText="Creating account...">Sign Up</AuthLoadingButton>
        <p className="signup-account-note form-wide">{form.role === 'staff' ? 'Create your staff account using your school email.' : 'Create your student account using your school email.'} Email verification is required.</p>
      </form>
      )}
    </div>
  )
}
