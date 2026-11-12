import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

// "Permanecer conectado": quando marcado a sessão fica no localStorage; senão, só enquanto a aba estiver aberta.
const REMEMBER_KEY = 'pb_remember'
export const setRemember = (v: boolean) => localStorage.setItem(REMEMBER_KEY, v ? '1' : '0')
const store = () => (localStorage.getItem(REMEMBER_KEY) === '0' ? sessionStorage : localStorage)

const storage = {
  getItem: (k: string) => store().getItem(k) ?? localStorage.getItem(k),
  setItem: (k: string, v: string) => {
    const other = store() === localStorage ? sessionStorage : localStorage
    other.removeItem(k)
    store().setItem(k, v)
  },
  removeItem: (k: string) => {
    localStorage.removeItem(k)
    sessionStorage.removeItem(k)
  },
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage },
})
