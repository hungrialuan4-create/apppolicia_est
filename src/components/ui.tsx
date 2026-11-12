import { ReactNode } from 'react'
import { STATUS_CLASS, STATUS_LABEL } from '../lib/format'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[status] ?? STATUS_CLASS.nao_confirmado}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">{children}</div>
}

export function Spinner() {
  return <div className="p-6 text-center text-sm text-slate-400">Carregando…</div>
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{message}</div>
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-3xl font-extrabold text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

export const chartColors = { brand: '#3b82f6', gold: '#d4af37', grid: 'rgba(255,255,255,.08)', text: '#94a3b8' }
