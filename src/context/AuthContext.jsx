import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile, signIn as authSignIn, signOut as authSignOut } from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      const p = await getProfile(userId)
      setProfile(p)
    } catch (err) {
      console.error('Failed to load customer profile:', err)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    // Get the initial session on first load.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user?.id).finally(() => setLoading(false))
    })

    // Stay in sync with login/logout/token-refresh events — including ones
    // triggered from another tab, or a session expiring.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user?.id)
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = useCallback(() => {
    return loadProfile(session?.user?.id)
  }, [session?.user?.id, loadProfile])

  // login/logout kept here (not just in lib/auth.js) so both the storefront
  // and admin routes can share one auth context instead of two separate
  // ones independently tracking the same underlying Supabase session.
  const login = useCallback(async (email, password) => {
    await authSignIn({ email, password })
  }, [])

  const logout = useCallback(async () => {
    await authSignOut()
  }, [])

  const value = {
    session,
    user: session?.user || null,
    profile,
    isLoggedIn: !!session,
    isAdmin: !!profile?.is_admin,
    loading,
    refreshProfile,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
