import { supabase } from './supabase'

// Signs up a new customer account. Supabase Auth handles password hashing
// and storage — we never touch raw passwords ourselves. After signup, we
// also create their row in customer_profiles (full_name, etc.) since
// auth.users only stores login credentials, not the profile fields the
// rest of the app needs.
export async function signUp({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }, // stashed on the auth user too, as a convenience/fallback
    },
  })

  if (error) throw error

  // If email confirmation is required (Supabase default), data.session will
  // be null here — the account exists but can't log in until they confirm.
  // The profile row is created either way so it's ready once they do.
  if (data.user) {
    const { error: profileError } = await supabase
      .from('customer_profiles')
      .insert({ id: data.user.id, full_name: fullName })

    // Don't fail signup over a profile row hiccup (e.g. it already exists
    // from a retry) — log it, but the auth account is what actually matters.
    if (profileError && profileError.code !== '23505') {
      console.error('Failed to create customer profile after signup:', profileError)
    }
  }

  return {
    user: data.user,
    needsEmailConfirmation: !data.session,
  }
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  // Fallback safety net: if email confirmation is required, the profile
  // row created during signUp() would have been silently blocked by RLS
  // (no active session existed at that moment to satisfy auth.uid() = id).
  // This ensures a profile row exists by the time someone actually logs in,
  // even if the signup-time attempt didn't stick. Harmless no-op if the
  // row already exists.
  if (data.user) {
    const { error: profileError } = await supabase
      .from('customer_profiles')
      .upsert(
        { id: data.user.id, full_name: data.user.user_metadata?.full_name || null },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    if (profileError) {
      console.error('Failed to ensure customer profile exists on login:', profileError)
    }
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

// Fetches the logged-in customer's profile (name, saved address, etc).
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('id, full_name, default_address, is_admin')
    .eq('id', userId)
    .single()

  if (error) {
    // A missing profile row (e.g. account created before this feature
    // existed) shouldn't crash the app — treat it as "no saved details yet."
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function updateProfile(userId, { fullName, defaultAddress }) {
  const { data, error } = await supabase
    .from('customer_profiles')
    .update({
      ...(fullName !== undefined && { full_name: fullName }),
      ...(defaultAddress !== undefined && { default_address: defaultAddress }),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/account/reset-password`,
  })
  if (error) throw error
}
