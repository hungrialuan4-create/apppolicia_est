import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { isConfigured } from './lib/supabase'
import Layout from './components/Layout'
import Login, { ResetPassword } from './pages/Login'
import Dashboard from './pages/Dashboard'
import Salaries from './pages/Salaries'
import News from './pages/News'
import Study from './pages/Study'
import Charts from './pages/Charts'
import CareerCalc from './pages/CareerCalc'
import Favorites from './pages/Favorites'
import Admin from './pages/Admin'
import { Spinner } from './components/ui'

function Protected() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session || !profile?.approved) return <Navigate to="/login" replace />
  return <Layout />
}

function AdminOnly() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Admin /> : <Navigate to="/" replace />
}

function SetupNotice() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="card max-w-lg space-y-2">
        <h1 className="text-lg font-bold text-white">Configure o Supabase</h1>
        <p className="text-sm text-slate-300">
          Copie <code>.env.example</code> para <code>.env.local</code> e preencha <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>. Depois reinicie com <code>npm run dev</code>. O passo a passo completo está no README.
        </p>
      </div>
    </div>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('[POLÍCIA BRASIL]', error) }
  render() {
    if (this.state.error)
      return <div className="p-6 text-sm text-red-300">Algo deu errado: {this.state.error.message}. Recarregue a página.</div>
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {!isConfigured ? (
        <SetupNotice />
      ) : (
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route element={<Protected />}>
                <Route index element={<Dashboard />} />
                <Route path="salarios" element={<Salaries />} />
                <Route path="noticias" element={<News />} />
                <Route path="estudos" element={<Study />} />
                <Route path="graficos" element={<Charts />} />
                <Route path="calculadora" element={<CareerCalc />} />
                <Route path="favoritos" element={<Favorites />} />
                <Route path="admin" element={<AdminOnly />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
)
