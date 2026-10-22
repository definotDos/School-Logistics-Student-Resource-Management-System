import { formatStudentId, policy, validateAccount } from '../../utils/accountValidation'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { AuthLoadingButton } from '../../components/auth/AuthLoadingButton'
import { LegalDialog } from '../../components/auth/LegalDialog'
import './Signup.css'

export function SignupPage({
  initialRole = 'student',
  onSignup,
  onChangeMode,
  error,
  isSubmitting = false,
  onVerifyEmail,
  onResendVerificationCode,
}) {
  const [form, setForm] = useState({ name: '', email: '', studentId: '', employeeId: '', password: '', confirmPassword: '', adminRegistrationCode: '', role: initialRole, campus: 'PHINMA University of Pangasinan' })
  const [showPassword, setShowPassword] = useState(false)
  const [legalDocument, setLegalDocument] = useState(null)
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
  const update = key => event => {
    setForm({ ...form, [key]: key === 'studentId' ? formatStudentId(event.target.value) : event.target.value })
    setValidationErrors(current => ({ ...current, [key]: '' }))
  }
  const identityLabel = form.role === 'student' ? 'Student ID' : 'Employee ID'
  const roleLabel = form.role === 'admin' ? 'Admin' : form.role === 'staff' ? 'Staff' : 'Student'

  const identityField = form.role === 'student' ? 'studentId' : 'employeeId'
  const submit = async event => {
    event.preventDefault()
    if (isSubmitting) return
    const errors = validateAccount(form, false, form.role === 'admin')
    if (form.password !== form.confirmPassword || !form.confirmPassword) errors.confirmPassword = 'Re-enter your password. Both passwords must match.'
    if (form.role === 'admin' && !form.adminRegistrationCode.trim()) errors.adminRegistrationCode = 'Enter the registration code provided by your system administrator.'
    if (Object.keys(errors).length) return setValidationErrors(errors)
    setValidationErrors({})
    try {
      const details = { name: form.name, email: form.email, password: form.password, role: form.role, campus: form.campus }
      if (form.role !== 'admin') details[identityField] = form[identityField]
      if (form.role === 'admin') details.adminRegistrationCode = form.adminRegistrationCode.trim()
      const result = await onSignup(details)
      if (result?.requiresVerification) setForm(current => ({ ...current, password: '', confirmPassword: '', adminRegistrationCode: '' }))
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
        <span className="auth-eyebrow">Step 2 of 2 · Email verification</span>
        <h2 ref={verificationHeading} tabIndex={-1}>OTP verification</h2>
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
          <small id="verification-code-help">Type or paste the 6-digit code from your email. It expires in 15 minutes. Check Spam if you cannot find it.</small>
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
    <div className="auth-form-wrap signup-form-wrap">
      <div className="auth-heading">
        <span className="auth-eyebrow">Step 1 of 2 · {roleLabel} registration</span>
        <h2>Create {roleLabel.toLowerCase()} account</h2>
        <p>Join your campus community. Start with your details below.</p>
      </div>
      <form className="auth-form signup-form" onSubmit={submit} aria-busy={isSubmitting}>
        {error && <div className="signup-alert form-wide" role="alert"><span className="signup-alert-icon" aria-hidden="true">!</span><div><strong>Unable to create account</strong><p>{error}</p></div></div>}
        <label className={`auth-field compact-field${form.role === 'admin' ? ' form-wide' : ''}`}>
          <span>Full name</span>
          <input className={validationErrors.name ? 'input-invalid' : ''} placeholder="Full name" value={form.name} onChange={update('name')} autoComplete="name" required aria-invalid={Boolean(validationErrors.name)} />
          {validationErrors.name && <small className="field-error">{validationErrors.name}</small>}
        </label>
        {form.role !== 'admin' && <label className="auth-field compact-field">
          <span>{identityLabel}</span>
          <input className={validationErrors[identityField] ? 'input-invalid' : ''} placeholder={form.role === 'student' ? '03-01-2425-023456' : 'UP-25-12345-A'} maxLength={17} inputMode={form.role === 'student' ? 'numeric' : 'text'} value={form[identityField]} onChange={update(identityField)} required aria-invalid={Boolean(validationErrors[identityField])} />
          <small className="signup-field-hint">{form.role === 'student' ? policy.studentIdHelp : policy.employeeIdHelp}</small>
          {validationErrors[identityField] && <small className="field-error">{validationErrors[identityField]}</small>}
        </label>}
        <label className="auth-field compact-field form-wide">
          <span>Email address</span>
          <input className={validationErrors.email ? 'input-invalid' : ''} type="email" placeholder="Your Gmail Account" value={form.email} onChange={update('email')} autoComplete="email" required aria-invalid={Boolean(validationErrors.email)} />
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
        <label className="auth-field compact-field form-wide">
          <span>Confirm password</span>
          <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={update('confirmPassword')} autoComplete="new-password" placeholder="Re-enter your password" required aria-invalid={Boolean(validationErrors.confirmPassword)} />
          {validationErrors.confirmPassword && <small className="field-error">{validationErrors.confirmPassword}</small>}
        </label>
        {form.role === 'admin' && <label className="auth-field compact-field form-wide">
          <span>Administrator registration code</span>
          <input type="password" value={form.adminRegistrationCode} onChange={update('adminRegistrationCode')} autoComplete="off" maxLength={256} placeholder="Code from your system administrator" required aria-invalid={Boolean(validationErrors.adminRegistrationCode)} />
          <small className="signup-field-hint">This authorizes admin registration. You will also verify your email with an OTP.</small>
          {validationErrors.adminRegistrationCode && <small className="field-error">{validationErrors.adminRegistrationCode}</small>}
        </label>}
        <div className="terms form-wide">
          <input id="signup-terms" type="checkbox" required aria-labelledby="signup-terms-label" />
          <span id="signup-terms-label"><label htmlFor="signup-terms">I agree to the </label><button type="button" aria-haspopup="dialog" onClick={() => setLegalDocument('terms')}>Terms of Service</button> and <button type="button" aria-haspopup="dialog" onClick={() => setLegalDocument('privacy')}>Privacy Policy</button>.</span>
        </div>
        <AuthLoadingButton className="auth-submit form-wide" loading={isSubmitting} loadingText="Sending verification code...">Sign up &amp; send OTP</AuthLoadingButton>
        <p className="signup-account-note form-wide">Use your Gmail or school email address. We will send a 6-digit code to verify your account.</p>
      </form>
      <p className="auth-footer"><Link to="/">Back to home</Link>{form.role !== 'student' && <> · <Link to={`/signup?role=${form.role === 'admin' ? 'staff' : 'admin'}`}>{form.role === 'admin' ? 'Staff' : 'Admin'} sign up</Link></>}</p>
      {legalDocument && <LegalDialog document={legalDocument} onClose={() => setLegalDocument(null)} />}
    </div>
  )
}
