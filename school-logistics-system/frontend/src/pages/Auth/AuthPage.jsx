import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { useAuth } from '../../context/useAuth'
import { LoginPage } from './Login'
import { SignupPage } from './Signup'

export function AuthPage() {
  const location = useLocation()
  const mode = location.pathname === '/login' ? 'login' : 'signup'
  const [selectedCampus, setSelectedCampus] = useState(undefined)
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { login, signup } = useAuth()

  const handleModeChange = nextMode => {
    if (nextMode === mode) return
    if (nextMode === 'signup') {
      setSelectedCampus(undefined)
      navigate('/signup', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }

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
      const result = await signup(details)
      setSelectedCampus(undefined)
      navigate('/login', { replace: true })
      return result
    } catch (error) {
      setAuthError(error.message)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      mode={mode}
      onChangeMode={handleModeChange}
      campus={selectedCampus}
    >
      {mode === 'login' ? (
        <LoginPage onLogin={handleLogin} onChangeMode={handleModeChange} error={authError} />
      ) : (
        <SignupPage
          onSignup={handleSignup}
          onCampusChange={setSelectedCampus}
          onChangeMode={handleModeChange}
          error={authError}
          isSubmitting={isSubmitting}
        />
      )}
    </AuthLayout>
  )
}

export default AuthPage
