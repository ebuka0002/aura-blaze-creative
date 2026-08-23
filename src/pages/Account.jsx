import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signUp, sendPasswordReset } from '../lib/auth'
import SEO from '../components/SEO'

export default function Account() {
  const { isLoggedIn, loading, user, login, logout, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="max-w-[500px] mx-auto px-5 py-24 text-center text-grey text-sm">
        Loading…
      </div>
    )
  }

  // Already logged in — show account overview instead of the login form.
  if (isLoggedIn) {
    return (
      <div className="max-w-[600px] mx-auto px-5 md:px-8 py-14 md:py-20">
        <SEO title="My Account" path="/account" noindex />
        <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-2">My Account</h1>
        <p className="text-grey text-sm mb-10">{user.email}</p>

        <div className="space-y-1 border-t border-hairline">
          <Link
            to="/account/orders"
            className="flex items-center justify-between py-4 border-b border-hairline hover:text-blaze transition-colors"
          >
            <span className="font-medium">Order History</span>
            <span className="text-grey text-sm">View past orders →</span>
          </Link>
          <div className="py-4 border-b border-hairline">
            <p className="font-medium mb-1">{profile?.full_name || 'No name on file'}</p>
            <p className="text-sm text-grey">{user.email}</p>
          </div>
        </div>

        <button
          onClick={async () => {
            await logout()
            navigate('/')
          }}
          className="mt-8 text-sm underline underline-offset-4 text-grey hover:text-blaze"
        >
          Log Out
        </button>
      </div>
    )
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      const from = location.state?.from || '/account'
      navigate(from, { replace: true })
    } catch {
      setError('Incorrect email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { needsEmailConfirmation } = await signUp({ email, password, fullName })
      if (needsEmailConfirmation) {
        setMessage("Almost there — check your email to confirm your account before logging in.")
        setMode('login')
      } else {
        navigate('/account', { replace: true })
      }
    } catch (err) {
      setError(err.message?.includes('already registered')
        ? 'An account with this email already exists — try logging in instead.'
        : 'Something went wrong creating your account. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await sendPasswordReset(email)
      setMessage('If an account exists for that email, a reset link is on its way.')
      setMode('login')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-[440px] mx-auto px-5 py-14 md:py-20">
      <SEO
        title={mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Reset Password' : 'Log In'}
        path="/account"
        noindex
      />
      <h1 className="font-display text-4xl tracking-wide mb-1 text-center">
        {mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Reset Password' : 'Log In'}
      </h1>
      <p className="text-grey text-sm text-center mb-8">
        {mode === 'signup'
          ? 'Faster checkout, order history, saved details.'
          : mode === 'reset'
          ? "We'll email you a link to reset your password."
          : 'Welcome back to Aura Blaze Creative.'}
      </p>

      {message && (
        <p className="text-sm text-void bg-bone-dim border border-hairline px-4 py-3 mb-5">{message}</p>
      )}

      {mode === 'reset' ? (
        <form onSubmit={handleReset} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
          />
          {error && <p className="text-xs text-blaze">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-void text-bone py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send Reset Link'}
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setMessage('') }}
            className="w-full text-sm underline underline-offset-4 text-grey hover:text-void py-2"
          >
            Back to login
          </button>
        </form>
      ) : (
        <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              required
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
          />

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setMode('reset'); setError(''); setMessage('') }}
              className="text-xs text-grey hover:text-blaze underline underline-offset-4"
            >
              Forgot password?
            </button>
          )}

          {error && <p className="text-xs text-blaze">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-void text-bone py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>
      )}

      {mode !== 'reset' && (
        <p className="text-center text-sm text-grey mt-6">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setMessage('') }}
            className="text-void underline underline-offset-4 hover:text-blaze"
          >
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </p>
      )}
    </div>
  )
}
