import { useState } from 'react'
import { Divider, Field, SocialButton } from '../../components/auth/AuthFields'

export function LoginPage({ onLogin, onChangeMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = event => {
    event.preventDefault()
    onLogin()
  }

  return (
    <div className="auth-form-wrap">
      <div className="auth-heading">
        <h2>Welcome back</h2>
        <p>Enter your details to access your student portal.</p>
      </div>
      <SocialButton />
      <Divider />
      <form className="auth-form" onSubmit={submit}>
        <Field label="School email" type="email" placeholder="you@school.edu" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <Field label="Password" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        <div className="auth-options">
          <label><input type="checkbox" /> Remember me</label>
          <button type="button">Forgot password?</button>
        </div>
        <button className="auth-submit" type="submit">Log in <span>→</span></button>
      </form>
      <p className="auth-footer">New to School Logistics? <button onClick={() => onChangeMode('signup')}>Create an account</button></p>
    </div>
  )
}
