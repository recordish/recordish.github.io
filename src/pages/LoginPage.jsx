import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { useAuth } from '../contexts/AuthContext'
import { loginWithGoogle } from '../services/authService'

export default function LoginPage() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleLogin = async () => {
    try {
      setError('')
      setBusy(true)
      await loginWithGoogle()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <h2>로그인</h2>
      <GoogleSignInButton onClick={handleLogin} disabled={busy} />
      {error && <p className="error">{error}</p>}
      <p className="links">
        로그인하면 <a href="/terms.html">이용약관</a>과 <a href="/privacy.html">개인정보처리방침</a>에 동의하는 것으로 봅니다.
      </p>
    </div>
  )
}
