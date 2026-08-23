import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'

// This page is what the link in the "Confirm your email" signup email
// points to. It deliberately requires an explicit button click before
// calling verifyOtp — see the comment in ResetPassword.jsx for the full
// reasoning: automated email security scanners can "prefetch" (silently
// visit) links in incoming emails before a person opens them. If page load
// alone confirmed the account, that prefetch could burn the single-use
// token before the real person ever sees the email, leaving them stuck on
// an expired link. Requiring a real click meaningfully reduces (though
// doesn't 100% eliminate — some scanners do simulate clicks) that risk.
export default function ConfirmEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenHash = searchParams.get('token_hash')

  const [status, setStatus] = useState('idle') // 'idle' | 'confirming' | 'success' | 'error'
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setStatus('confirming')
    setError('')
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'signup',
      })
      if (verifyError) throw verifyError
      setStatus('success')
      setTimeout(() => navigate('/account', { replace: true }), 2000)
    } catch (err) {
      setStatus('error')
      setError(
        err.message?.includes('expired') || err.message?.includes('invalid')
          ? 'This confirmation link has already been used or has expired.'
          : err.message || 'Something went wrong confirming your account.'
      )
    }
  }

  if (!tokenHash) {
    return (
      <div className="max-w-[440px] mx-auto px-5 py-24 text-center">
        <SEO title="Invalid Link" path="/account/confirm" noindex />
        <h1 className="font-display text-3xl tracking-wide mb-3">Invalid Link</h1>
        <p className="text-grey text-sm mb-6">
          This confirmation link is missing required information.
        </p>
        <Link
          to="/account"
          className="inline-block bg-void text-bone px-7 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
        >
          Back to Account
        </Link>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="max-w-[440px] mx-auto px-5 py-24 text-center">
        <SEO title="Email Confirmed" path="/account/confirm" noindex />
        <h1 className="font-display text-3xl tracking-wide mb-3">Email Confirmed</h1>
        <p className="text-grey text-sm">Redirecting you to your account…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="max-w-[440px] mx-auto px-5 py-24 text-center">
        <SEO title="Couldn't Confirm" path="/account/confirm" noindex />
        <h1 className="font-display text-3xl tracking-wide mb-3">Couldn't Confirm</h1>
        <p className="text-grey text-sm mb-6">{error}</p>
        <p className="text-xs text-grey mb-6">
          If you already tried signing up, try logging in — your account may already be confirmed.
        </p>
        <Link
          to="/account"
          className="inline-block bg-void text-bone px-7 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
        >
          Back to Account
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[440px] mx-auto px-5 py-24 text-center">
      <SEO title="Confirm Your Account" path="/account/confirm" noindex />
      <h1 className="font-display text-3xl tracking-wide mb-3">Confirm Your Account</h1>
      <p className="text-grey text-sm mb-8">
        Click below to finish confirming your email address for Aura Blaze Creative.
      </p>
      <button
        onClick={handleConfirm}
        disabled={status === 'confirming'}
        className="bg-void text-bone px-7 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors disabled:opacity-60"
      >
        {status === 'confirming' ? 'Confirming…' : 'Confirm My Account'}
      </button>
    </div>
  )
}
