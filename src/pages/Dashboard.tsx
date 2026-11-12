import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GraduationCap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { brl, dateBR } from '../lib/format'
import { chartColors, ErrorBox, PageHeader, Stat, StatusBadge } from '../components/ui'

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return (
    <div className="text-right">
      <div className="text-2xl font-bold tabular-nums text-white">{now.toLocaleTimeString('pt-BR')}</div>
      <div className="text-xs capitalize text-slate-400">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  )
}

export default function Dashboard() {
  const [err, setErr] = useState<string | null>(null)
  const [counts, setCounts] = useState({ inst: 0, open: 0, planned: 0 })
  const [news, setNews] = useState<any[]>([])
  const [salaries, setSalaries] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const head = { count: 'exact' as const, head: true }
        const [a, b, c, n, s] = await Promise.all([
          supabase.from('institutions').select('*', head),
          supabase.from('contests').select('*', head).in('status', ['edital_publicado', 'inscricoes_abertas', 'em_andamento']),
          supabase.from('contests').select('*', head).in('status', ['previsto', 'autorizado']),
          supabase.from('news').select('*').order('priority').order('published_at', { ascending: false }).limit(5),
          supabase.from('salary_records').select('*, institutions(name, state)').order('updated_at', { ascending: false }).limit(20),
        ])
        const failed = [a, b, c, n, s].find((r) => r.error)
        if (failed?.error) throw failed.error
        setCounts({ inst: a.count ?? 0, open: b.count ?? 0, planned: c.count ?? 0 })
        setNews(n.data ?? [])
        setSalaries(s.data ?? [])
      } catch (e: any) { setErr(e.message) }
    })()
  }, [])

  const chart = salaries.filter((r) => r.salary_initial).slice(0, 8)
    .map((r) => ({ nome: `${r.institutions?.name?.replace('Polícia ', 'P. ') ?? ''} · ${r.role_title.split(' ')[0]}`, inicial: Number(r.salary_initial) }))

  return (
    <>
      <PageHeader title="Painel" subtitle="Visão geral das carreiras policiais" actions={<Clock />} />
      {err && <ErrorBox message={err} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Instituições cadastradas" value={counts.inst} />
        <Stat label="Concursos abertos" value={counts.open} hint="Edital publicado, inscrições ou em andamento" />
        <Stat label="Concursos previstos" value={counts.planned} hint="Autorizados ou previstos" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold text-white">Salários iniciais registrados</h2>
          {chart.length === 0 ? <p className="text-sm text-slate-400">Nenhum salário com valor confirmado ou em verificação ainda.</p> : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="nome" tick={{ fill: chartColors.text, fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: chartColors.text, fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: '#0e1729', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
                  <Bar dataKey="inicial" name="Salário inicial" fill={chartColors.brand} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <Link to="/estudos" className="card flex flex-col justify-between bg-gradient-to-br from-brand/25 to-navy-800 hover:ring-1 hover:ring-gold/40">
          <GraduationCap className="text-gold" size={32} />
          <div>
            <div className="mt-6 text-lg font-bold text-white">Hora de estudar</div>
            <p className="text-sm text-slate-300">Questões, simulados e resumos por disciplina.</p>
          </div>
        </Link>

        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Últimas notícias</h2><Link to="/noticias" className="text-xs text-brand-soft">Ver todas</Link></div>
          {news.length === 0 ? <p className="text-sm text-slate-400">Sem notícias ainda. A rotina automática (ou o administrador) as publica.</p> : (
            <ul className="divide-y divide-white/5">
              {news.map((n) => (
                <li key={n.id} className="py-2">
                  <a href={n.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-white hover:text-gold-soft">{n.title}</a>
                  <div className="text-xs text-slate-500">{n.institution_name ?? 'Geral'} · {dateBR(n.published_at)} · {n.source_name}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Últimas atualizações salariais</h2><Link to="/salarios" className="text-xs text-brand-soft">Ver</Link></div>
          {salaries.length === 0 ? <p className="text-sm text-slate-400">Nenhuma atualização registrada.</p> : (
            <ul className="space-y-3">
              {salaries.slice(0, 5).map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="font-medium text-white">{r.institutions?.name} — {r.role_title}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">{brl(r.salary_initial)} <StatusBadge status={r.status} /></div>
                  <div className="text-[11px] text-slate-500">Atualizado em {dateBR(r.updated_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
