import { supabase } from './supabase'

export async function subscribeToNewsletter(email) {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error('Please enter your email address.')
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.')
  }

  const { data, error } = await supabase.functions.invoke(
    'newsletter-subscribe',
    {
      body: {
        email: normalizedEmail,
      },
    }
  )

  if (error) {
    throw new Error(
      error.message || 'Something went wrong. Please try again.'
    )
  }

  if (!data?.success) {
    throw new Error(
      data?.error || 'Something went wrong. Please try again.'
    )
  }

  return data
}