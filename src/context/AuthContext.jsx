import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile, signIn as authSignIn, signOut as authSignOut } from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId, fallbackUser = null) => {
    if (!userId) {
      setProfile(null)
      return null
    }

    try {
      const p = await getProfile(userId)
      // Immediately after email confirmation, the database profile can take
      // a moment to become available. Use the name stored in Supabase Auth as
      // a temporary fallback so the customer name appears without requiring
      // a logout/login cycle. The database profile replaces this fallback
      // whenever it is available.
      const resolvedProfile = p || (fallbackUser?.user_metadata?.full_name
        ? {
            id: userId,
            full_name: fallbackUser.user_metadata.full_name,
            default_address: null,
            is_admin: false,
          }
        : null)

      setProfile(resolvedProfile)
      return resolvedProfile
    } catch (err) {
      console.error('Failed to load customer profile:', err)

      if (fallbackUser?.user_metadata?.full_name) {
        setProfile({
          id: userId,
          full_name: fallbackUser.user_metadata.full_name,
          default_address: null,
          is_admin: false,
        })
      } else {
        setProfile(null)
      }

      return null
    }
  }, [])

  useEffect(() => {
    // Get the initial session on first load.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user?.id, data.session?.user).finally(() => setLoading(false))
    })

    // Stay in sync with login/logout/token-refresh events — including ones
    // triggered from another tab, or a session expiring.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user?.id, newSession?.user)
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    // Immediately after verifyOtp(), the auth event can fire before React has
    // committed the new session to state. Read the current Supabase session
    // directly so callers can refresh the profile reliably before navigating.
    const { data } = await supabase.auth.getSession()
    const currentSession = data.session

    setSession(currentSession)
    return loadProfile(currentSession?.user?.id, currentSession?.user)
  }, [loadProfile])

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
