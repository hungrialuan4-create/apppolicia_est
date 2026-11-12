import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Banknote, Newspaper, GraduationCap, BarChart3, Calculator, Star, ShieldCheck, LogOut, Bell } from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

const items = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/salarios', label: 'Salários', icon: Banknote },
  { to: '/noticias', label: 'Notícias', icon: Newspaper },
  { to: '/estudos', label: 'Estudos', icon: GraduationCap },
  { to: '/graficos', label: 'Gráficos', icon: BarChart3 },
  { to: '/calculadora', label: 'Calculadora', icon: Calculator },
  { to: '/favoritos', label: 'Favoritos', icon: Star },
]

export default function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const nav = isAdmin ? [...items, { to: '/admin', label: 'Admin', icon: ShieldCheck }] : items

  // Notificações em tempo real para notícias marcadas como importantes
  useEffect(() => {
    const ch = supabase
      .channel('news-important')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'news' }, (payload) => {
        const n: any = payload.new
        if (!n.important) return
        setToast(n.title)
        if ('Notification' in window && Notification.permission === 'granted') new Notification('POLÍCIA BRASIL', { body: n.title })
        setTimeout(() => setToast(null), 8000)
      })
      .subscribe()
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return (
    <div className="flex min-h-full">
      {/* Menu lateral (computador / tablet) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-navy-900/90 p-4 md:flex">
        <div className="mb-6 px-2 pt-1"><Logo /></div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand/15 text-white ring-1 ring-brand/40' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-3">
          <div className="truncate px-2 text-xs text-slate-400">{profile?.full_name || profile?.email}</div>
          <button onClick={signOut} className="btn-ghost mt-2 w-full"><LogOut size={16} /> Sair</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-navy-900/80 px-4 py-3 md:hidden">
          <Logo />
          <button onClick={signOut} aria-label="Sair" className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><LogOut size={18} /></button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 sm:p-6 md:pb-8">
          <Outlet />
        </main>
      </div>

      {toast && (
        <div className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-gold/40 bg-navy-800 p-3 shadow-xl animate-fadeUp">
          <Bell size={18} className="mt-0.5 shrink-0 text-gold" />
          <div className="text-sm"><div className="font-semibold text-white">Notícia importante</div><div className="text-slate-300">{toast}</div></div>
        </div>
      )}

      {/* Menu inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-white/10 bg-navy-900/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex min-w-[72px] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium ${isActive ? 'text-gold' : 'text-slate-400'}`}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
