import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const { login, user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in and confirmed admin — skip straight past the login form.
  if (!loading && user && isAdmin) {
    const from = location.state?.from || '/admin'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      // AuthContext's onAuthStateChange listener updates isAdmin
      // asynchronously — this component will naturally redirect once that
      // resolves and re-renders, via the `user && isAdmin` check above. We
      // don't navigate manually here to avoid a flash of "not admin" content.
    } catch (err) {
      setError('Incorrect email or password.')
      setSubmitting(false)
    }
  }

  // If logged in but confirmed NOT an admin, say so clearly rather than
  // loop back to a blank login form with no explanation.
  if (!loading && user && !isAdmin) {
    return (
      <div className="min-h-screen bg-void text-bone flex items-center justify-center px-5">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-3xl tracking-wide mb-3">Access Denied</h1>
          <p className="text-bone/60 text-sm">
            This account ({user.email}) doesn't have admin access to Aura Blaze Creative.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void text-bone flex items-center justify-center px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="font-display text-3xl tracking-wide mb-1 text-center">Aura Blaze</h1>
        <p className="text-bone/50 text-xs tracking-[0.15em] uppercase text-center mb-8">Admin</p>

        <div className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border border-bone/25 px-4 py-3 text-sm focus:outline-none focus:border-blaze-bright placeholder:text-bone/40"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border border-bone/25 px-4 py-3 text-sm focus:outline-none focus:border-blaze-bright placeholder:text-bone/40"
          />
        </div>

        {error && <p className="text-xs text-blaze-bright mt-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-bone text-void py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze-bright hover:text-bone transition-colors mt-6 disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
