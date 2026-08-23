import { useState } from 'react'
import { Divider, Field, SocialButton } from '../../components/auth/AuthFields'

export function SignupPage({ onLogin, onChangeMode }) {
  const [form, setForm] = useState({ name: '', email: '', studentId: '', password: '' })
  const update = key => event => setForm({ ...form, [key]: event.target.value })

  const submit = event => {
    event.preventDefault()
    onLogin()
  }

  return (
    <div className="auth-form-wrap">
      <div className="auth-heading">
        <h2>Create your account</h2>
        <p>Set up your student portal in just a few moments.</p>
      </div>
      <SocialButton />
      <Divider />
      <form className="auth-form" onSubmit={submit}>
        <Field label="Full name" placeholder="Alex Morgan" value={form.name} onChange={update('name')} autoComplete="name" />
        <Field label="School email" type="email" placeholder="you@school.edu" value={form.email} onChange={update('email')} autoComplete="email" />
        <Field label="Student ID" placeholder="e.g. 2024-00123" value={form.studentId} onChange={update('studentId')} />
        <Field label="Password" type="password" placeholder="Create a password" value={form.password} onChange={update('password')} autoComplete="new-password" />
        <label className="terms"><input type="checkbox" required /> I agree to the <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button>.</label>
        <button className="auth-submit" type="submit">Create account <span>→</span></button>
      </form>
      <p className="auth-footer">Already have an account? <button onClick={() => onChangeMode('login')}>Log in</button></p>
    </div>
  )
}
