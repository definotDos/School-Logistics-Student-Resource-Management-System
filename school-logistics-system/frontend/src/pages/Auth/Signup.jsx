import { idType, validateAccount } from '../../utils/accountValidation'
import { useEffect, useRef, useState } from 'react'
import { authAPI, campusAPI } from '../../services/api'
import { campuses as campusDirectory } from '../../data/campuses'
import { AuthLoadingButton } from '../../components/auth/AuthLoadingButton'
import { LegalDialog } from '../../components/auth/LegalDialog'
import './Signup.css'

export function SignupPage({
  onSignup,
  onChangeMode,
  error,
  isSubmitting = false,
  onVerifyEmail,
  onResendVerificationCode,
}) {
  const [form, setForm] = useState({ name: '', email: '', studentId: '', employeeId: '', password: '', role: 'student', campus: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [legalDocument, setLegalDocument] = useState(null)
  const [employeeIdChecked, setEmployeeIdChecked] = useState(false)
  const [isCheckingId, setIsCheckingId] = useState(false)
  const [employeeIdError, setEmployeeIdError] = useState('')
  const detailsHeading = useRef(null)
  const employeeIdInput = useRef(null)
  useEffect(() => {
    if (form.role === 'staff') employeeIdInput.current?.focus()
  }, [form.role])
  useEffect(() => {
    if (employeeIdError && !isCheckingId) employeeIdInput.current?.focus()
  }, [employeeIdError, isCheckingId])
  useEffect(() => {
    if (employeeIdChecked) detailsHeading.current?.focus()
  }, [employeeIdChecked])
  const changeAccountType = role => {
    setForm(current => ({ ...current, role, studentId: '', employeeId: '', password: '' }))
    setEmployeeIdChecked(false)
    setEmployeeIdError('')
    setValidationErrors({})
    setCampusMenuOpen(false)
  }
  const checkEmployeeId = async event => {
    event.preventDefault()
    if (isCheckingId) return
    if (idType(form.employeeId) !== 'employee') {
      setEmployeeIdError(form.employeeId.trim() ? 'Use UP-, 2 digits, 3 to 5 digits, and one letter (A-Z), separated by hyphens. Example: UP-25-12345-A.' : 'Enter your employee ID to continue.')
      return
    }
    setIsCheckingId(true)
    setEmployeeIdError('')
    try {
      const result = await authAPI.checkEmployeeId(form.employeeId)
      setForm(current => ({ ...current, employeeId: result.employeeId }))
      setEmployeeIdChecked(true)
    } catch (checkError) {
      setEmployeeIdError(checkError.message || 'We could not check your employee ID. Please try again.')
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

  const identityField = form.role === 'student' ? 'studentId' : 'employeeId'
  const submit = async event => {
    event.preventDefault()
    if (isSubmitting) return
    if (form.role === 'staff' && !employeeIdChecked) return
    const errors = validateAccount(form)
    if (Object.keys(errors).length) return setValidationErrors(errors)
    setValidationErrors({})
    try {
      const result = await onSignup({ ...form, [form.role === 'student' ? 'employeeId' : 'studentId']: undefined })
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
        <h2 ref={detailsHeading} tabIndex={-1}>{form.role === 'staff' ? 'Create staff account' : 'Create account'}</h2>
        <p>Join your campus. Get the resources you need.</p>
      </div>
      {form.role === 'staff' ? (
        <div className="signup-id-summary signup-role-summary">
          <span>Account type: <strong>Staff / Employee</strong></span>
          <button type="button" disabled={isCheckingId || isSubmitting} onClick={() => changeAccountType('student')}>Change account type</button>
        </div>
      ) : (
      <fieldset className="signup-role-picker" disabled={isCheckingId || isSubmitting}>
        <legend>Choose your account type</legend>
        <p className="signup-role-help">Select the role you use on campus.</p>
        <div className="signup-role-options">
          {[
            ['student', 'Student', 'Use your student ID'],
            ['staff', 'Staff / Employee', 'Use your employee ID'],
          ].map(([role, label, description]) => (
            <label key={role} className={form.role === role ? 'selected' : ''}>
              <input type="radio" name="signup-role" value={role} checked={form.role === role} onChange={() => changeAccountType(role)} />
              <span className="signup-role-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {role === 'student' ? <><path d="m2 9 10-5 10 5-10 5-10-5Z" /><path d="M6 11v6c4 3 8 3 12 0v-6M22 9v7" /></> : <><rect x="3" y="7" width="18" height="14" rx="3" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a22 22 0 0 0 18 0M12 12v3" /></>}
                </svg>
              </span>
              <span className="signup-role-copy"><strong>{label}</strong><small>{description}</small></span>
            </label>
          ))}
        </div>
      </fieldset>
      )}
      {form.role === 'staff' && <ol className="signup-steps" aria-label="Staff signup progress">
        <li className={employeeIdChecked ? 'is-complete' : ''} aria-current={!employeeIdChecked ? 'step' : undefined}><span className="signup-step-number" aria-hidden="true">{employeeIdChecked ? '✓' : '1'}</span><span>Employee ID{employeeIdChecked && <span className="signup-step-status">Complete</span>}</span></li>
        <li aria-current={employeeIdChecked ? 'step' : undefined}><span className="signup-step-number" aria-hidden="true">2</span><span>Account details</span></li>
        <li><span className="signup-step-number" aria-hidden="true">3</span><span>Verify email</span></li>
      </ol>}
      {form.role === 'staff' && !employeeIdChecked ? (
        <form className="auth-form signup-form signup-id-form" onSubmit={checkEmployeeId} noValidate aria-busy={isCheckingId}>
          <div className="signup-section-heading form-wide"><span>STEP 1 OF 3</span><h3>Enter your employee ID</h3><p>We’ll check if your ID is available for registration.</p></div>
          <label className="auth-field compact-field form-wide">
            <span>Employee ID</span>
            <input ref={employeeIdInput} className={employeeIdError ? 'input-invalid' : ''} value={form.employeeId} onChange={event => { setForm(current => ({ ...current, employeeId: event.target.value.toUpperCase() })); setEmployeeIdError('') }} placeholder="e.g. UP-25-12345-A" maxLength={13} required disabled={isCheckingId} autoCapitalize="characters" spellCheck={false} aria-invalid={Boolean(employeeIdError)} aria-describedby={employeeIdError ? 'employee-id-error' : undefined} />
          </label>
          {employeeIdError && <div id="employee-id-error" className="signup-alert form-wide" role="alert"><span className="signup-alert-icon" aria-hidden="true">!</span><div><strong>Check your employee ID</strong><p>{employeeIdError}</p></div></div>}
          <AuthLoadingButton className="auth-submit form-wide" loading={isCheckingId} loadingText="Checking employee ID...">Continue to account details <span aria-hidden="true">→</span></AuthLoadingButton>
          <p className="signup-account-note form-wide">Already registered? <button type="button" onClick={() => onChangeMode('login')}>Log in to your account</button></p>
        </form>
      ) : (
      <form className="auth-form signup-form" onSubmit={submit} aria-busy={isSubmitting}>
        {form.role === 'staff' && <div className="signup-id-summary form-wide"><span>Employee ID: <strong>{form.employeeId}</strong></span><button type="button" disabled={isSubmitting} onClick={() => { setEmployeeIdChecked(false); setEmployeeIdError(''); setForm(current => ({ ...current, password: '' })) }}>Change ID</button></div>}
        {error && <div className="signup-alert form-wide" role="alert"><span className="signup-alert-icon" aria-hidden="true">!</span><div><strong>Unable to create account</strong><p>{error}</p></div></div>}
        {campusError && <div className="signup-alert form-wide" role="alert"><span className="signup-alert-icon" aria-hidden="true">!</span><div><strong>Unable to load campuses</strong><p>{campusError}</p></div></div>}
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
          <input className={validationErrors[identityField] ? 'input-invalid' : ''} placeholder={identityLabel} maxLength={16} value={form[identityField]} onChange={update(identityField)} readOnly={form.role === 'staff'} required aria-invalid={Boolean(validationErrors[identityField])} />
          {validationErrors[identityField] && <small className="field-error">{validationErrors[identityField]}</small>}
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
        <div className="terms form-wide">
          <input id="signup-terms" type="checkbox" required aria-labelledby="signup-terms-label" />
          <span id="signup-terms-label"><label htmlFor="signup-terms">I agree to the </label><button type="button" aria-haspopup="dialog" onClick={() => setLegalDocument('terms')}>Terms of Service</button> and <button type="button" aria-haspopup="dialog" onClick={() => setLegalDocument('privacy')}>Privacy Policy</button>.</span>
        </div>
        <AuthLoadingButton className="auth-submit form-wide" loading={isSubmitting} loadingText="Creating account...">Sign Up</AuthLoadingButton>
        <p className="signup-account-note form-wide">{form.role === 'staff' ? 'Create your staff account using your school email.' : 'Create your student account using your school email.'} Email verification is required.</p>
      </form>
      )}
      {legalDocument && <LegalDialog document={legalDocument} onClose={() => setLegalDocument(null)} />}
    </div>
  )
}
