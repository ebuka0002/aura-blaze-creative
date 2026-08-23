import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SEO from '../components/SEO'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function Unsubscribe() {
  const [searchParams] = useSearchParams()

  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('This unsubscribe link is missing a valid token.')
      return
    }

    const unsubscribe = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/unsubscribe?token=${encodeURIComponent(token)}`
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Unable to unsubscribe.'
          )
        }

        setStatus('success')
        setMessage(
          data.message ||
            "You have been unsubscribed successfully."
        )
      } catch (error) {
        console.error('Unsubscribe error:', error)

        setStatus('error')
        setMessage(
          error.message ||
            'Something went wrong. Please try again.'
        )
      }
    }

    unsubscribe()
  }, [searchParams])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-20">
      <SEO
        title="Unsubscribe"
        path="/unsubscribe"
        noindex
      />

      <div className="max-w-lg w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-2 border-void border-t-transparent rounded-full animate-spin mx-auto mb-6" />

            <h1 className="font-display text-3xl tracking-wide mb-3">
              Processing...
            </h1>

            <p className="text-grey text-sm">
              Please wait while we update your preferences.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 border border-void rounded-full flex items-center justify-center mx-auto mb-6 text-xl">
              ✓
            </div>

            <h1 className="font-display text-4xl tracking-wide mb-4">
              You're Unsubscribed
            </h1>

            <p className="text-grey text-sm leading-6 mb-8">
              {message}
            </p>

            <Link
              to="/"
              className="inline-block bg-void text-bone px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
            >
              Back to Aura Blaze
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="font-display text-4xl tracking-wide mb-4">
              Something Went Wrong
            </h1>

            <p className="text-grey text-sm leading-6 mb-8">
              {message}
            </p>

            <Link
              to="/"
              className="inline-block bg-void text-bone px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
            >
              Back to Aura Blaze
            </Link>
          </>
        )}
      </div>
    </div>
  )
}