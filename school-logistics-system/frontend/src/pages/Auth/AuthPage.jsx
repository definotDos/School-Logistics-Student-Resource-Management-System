import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { useAuth } from '../../context/useAuth'
import { LoginPage } from './Login'
import { SignupPage } from './Signup'

export function AuthPage() {
  const [mode, setMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { login, signup, logout } = useAuth()

  const handleLogin = async (email, password) => {
    setAuthError('')
    try {
      const user = await login(email, password)
      navigate(user.role === 'admin' ? '/admin' : '/student')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  const handleSignup = async (details) => {
    if (isSubmitting) return
    setAuthError('')
    setIsSubmitting(true)
    try {
      const createdUser = await signup(details)
      logout()
      setMode('login')
      setAuthError(`Account created for ${createdUser.name}. Please log in to continue.`)
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout mode={mode} onChangeMode={setMode}>
      {mode === 'login' ? (
        <LoginPage onLogin={handleLogin} onChangeMode={setMode} error={authError} />
      ) : (
        <SignupPage onSignup={handleSignup} onChangeMode={setMode} error={authError} isSubmitting={isSubmitting} />
      )}
    </AuthLayout>
  )
}

export default AuthPage
