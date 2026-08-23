import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'

// This page is what the link in the "Reset Password" email points to.
//
// IMPORTANT — why this doesn't verify the token on page load:
// Many email providers (Gmail security scanning, Microsoft Defender Safe
// Links, some spam filters) automatically "click" links in incoming emails
// to scan them for safety, before a person ever opens the email. If loading
// this page immediately consumed the recovery token, that automated
// prefetch would burn it, and the real person would hit "link expired"
// seconds later despite only clicking once.
//
// Instead: the token_hash sits inertly in the URL until the person actually
// fills in a new password and submits the form. THAT'S the moment we
// exchange the token (via verifyOtp) and immediately set the new password
// in the same step — a page load alone does nothing.
//
// This page must stay PUBLICLY accessible (no login-required guard), since
// the whole point of the recovery link is that it IS the user's way in.
export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenHash = searchParams.get('token_hash')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      // Exchange the token for a real session — this is the moment the link
      // is actually "used." If it was already consumed (e.g. by an email
      // prefetch bot) or has expired, this throws and we show that clearly
      // rather than a confusing generic error.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      })
      if (verifyError) throw verifyError

      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => navigate('/account', { replace: true }), 2000)
    } catch (err) {
      setError(
        err.message?.includes('expired') || err.message?.includes('invalid')
          ? 'This link has already been used or has expired. Please request a new one.'
          : err.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!tokenHash) {
    return (
      <div className="max-w-[440px] mx-auto px-5 py-24 text-center">
        <SEO title="Invalid Link" path="/account/reset-password" noindex />
        <h1 className="font-display text-3xl tracking-wide mb-3">Invalid Link</h1>
        <p className="text-grey text-sm mb-6">
          This password reset link is missing required information. Please request a new one.
        </p>
        <button
          onClick={() => navigate('/account')}
          className="bg-void text-bone px-7 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
        >
          Back to Account
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-[440px] mx-auto px-5 py-24 text-center">
        <SEO title="Password Updated" path="/account/reset-password" noindex />
        <h1 className="font-display text-3xl tracking-wide mb-3">Password Updated</h1>
        <p className="text-grey text-sm">Redirecting you to your account…</p>
      </div>
    )
  }

  return (
    <div className="max-w-[440px] mx-auto px-5 py-14 md:py-20">
      <SEO title="Set New Password" path="/account/reset-password" noindex />
      <h1 className="font-display text-4xl tracking-wide mb-1 text-center">Set New Password</h1>
      <p className="text-grey text-sm text-center mb-8">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          required
          minLength={6}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
        />
        {error && <p className="text-xs text-blaze">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-void text-bone py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors disabled:opacity-60"
        >
          {submitting ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
