import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function checkAdminStatus(sessionUser) {
    if (!sessionUser) {
      setUser(null)
      setIsAdmin(false)
      return
    }
    setUser(sessionUser)
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('is_admin')
      .eq('id', sessionUser.id)
      .single()

    // No error handling drama here — if the profile doesn't exist yet or
    // the check fails for any reason, default to "not admin". Fail closed,
    // not open, for anything permission-related.
    setIsAdmin(!error && !!data?.is_admin)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdminStatus(session?.user || null).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdminStatus(session?.user || null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
