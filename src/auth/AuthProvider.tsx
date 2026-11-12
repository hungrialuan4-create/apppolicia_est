import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, setRemember } from '../lib/supabase'

export type Profile = { id: string; email: string; full_name: string | null; role: 'admin' | 'user'; approved: boolean }

type Ctx = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string, remember: boolean) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (s: Session | null) => {
    if (!s) return setProfile(null)
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
    setProfile((data as Profile) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // adia a consulta para fora do callback (evita deadlock do supabase-js)
      setTimeout(() => loadProfile(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const translate = (m: string) => {
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.'
    if (/Cadastro não autorizado/i.test(m) || /Database error saving new user/i.test(m))
      return 'Cadastro não autorizado. Peça acesso ao administrador.'
    if (/already registered/i.test(m)) return 'Este e-mail já está cadastrado.'
    if (/Password should be/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.'
    if (/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.'
    return m
  }

  const value: Ctx = {
    session,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' && profile.approved,
    signIn: async (email, password, remember) => {
      setRemember(remember)
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      return error ? translate(error.message) : null
    },
    signUp: async (email, password, name) => {
      if (password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password, options: { data: { full_name: name } },
      })
      return error ? translate(error.message) : null
    },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      return error ? translate(error.message) : null
    },
    updatePassword: async (password) => {
      if (password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
      const { error } = await supabase.auth.updateUser({ password })
      return error ? translate(error.message) : null
    },
    signOut: async () => { await supabase.auth.signOut() },
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
