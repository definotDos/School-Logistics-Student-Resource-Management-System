import { useState } from 'react'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'

export function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login')

  return (
    <AuthLayout mode={mode} onChangeMode={setMode}>
      {mode === 'login' ? (
        <LoginPage onLogin={onLogin} onChangeMode={setMode} />
      ) : (
        <SignupPage onLogin={onLogin} onChangeMode={setMode} />
      )}
    </AuthLayout>
  )
}
