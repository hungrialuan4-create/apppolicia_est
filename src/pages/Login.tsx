import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { LogoMark } from '../components/Logo'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'reset'

export default function Login() {
  const { session, profile, signIn, signUp, resetPassword, signOut } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (session && profile?.approved) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null); setInfo(null)
    let err: string | null = null
    if (mode === 'login') err = await signIn(email, password, remember)
    else if (mode === 'signup') {
      err = await signUp(email, password, name)
      if (!err) {
        const { data } = await supabase.auth.getSession()
        if (!data.session) setInfo('Cadastro criado. Confirme seu e-mail para entrar.')
      }
    } else {
      err = await resetPassword(email)
      if (!err) setInfo('Se o e-mail existir, você receberá um link para redefinir a senha.')
    }
    if (err) setError(err)
    setBusy(false)
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeUp">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={64} />
          <h1 className="mt-3 text-2xl font-extrabold tracking-[.2em] text-white">POLÍCIA</h1>
          <div className="text-sm font-bold tracking-[.6em] text-gold">BRASIL</div>
          <p className="mt-3 text-sm text-slate-400">Carreiras, concursos, salários e estudos. Acesso restrito.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Solicitar cadastro' : 'Recuperar senha'}
          </h2>

          {session && !profile?.approved && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              Seu acesso ainda não foi liberado pelo administrador.
              <button type="button" onClick={signOut} className="ml-2 underline">Sair</button>
            </div>
          )}

          {mode === 'signup' && (
            <div><label className="label">Nome</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
          )}
          <div><label className="label">E-mail</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          {mode !== 'reset' && (
            <div><label className="label">Senha</label>
              <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
          )}
          {mode === 'login' && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-blue-500" />
              Permanecer conectado
            </label>
          )}

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
          {info && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{info}</div>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar cadastro' : 'Enviar link'}
          </button>

          <div className="flex justify-between text-xs text-slate-400">
            {mode === 'login' ? (
              <>
                <button type="button" className="hover:text-white" onClick={() => { setMode('reset'); setError(null) }}>Esqueci a senha</button>
                <button type="button" className="hover:text-white" onClick={() => { setMode('signup'); setError(null) }}>Solicitar cadastro</button>
              </>
            ) : (
              <button type="button" className="hover:text-white" onClick={() => { setMode('login'); setError(null); setInfo(null) }}>← Voltar ao login</button>
            )}
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          Novos cadastros só são aceitos para e-mails autorizados pelo administrador.
        </p>
      </div>
    </div>
  )
}

export function ResetPassword() {
  const { updatePassword, session } = useAuth()
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err = await updatePassword(pw)
    if (err) setMsg(err)
    else setDone(true)
  }
  if (done) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-white">Definir nova senha</h2>
        {!session && <p className="text-sm text-slate-400">Abra esta página pelo link enviado ao seu e-mail.</p>}
        <input className="input" type="password" minLength={8} required placeholder="Nova senha (mín. 8 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} />
        {msg && <div className="text-sm text-red-300">{msg}</div>}
        <button className="btn-primary w-full" disabled={!session}>Salvar senha</button>
      </form>
    </div>
  )
}
