import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { brl, CONTEST_STATUS } from '../lib/format'
import { chartColors, Empty, ErrorBox, PageHeader } from '../components/ui'

const tip = { contentStyle: { background: '#0e1729', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 } }
const axis = { tick: { fill: chartColors.text, fontSize: 11 } }

function Box({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <div className="card"><h2 className="font-semibold text-white">{title}</h2>{note && <p className="mb-3 text-xs text-slate-500">{note}</p>}{children}</div>
}

export default function Charts() {
  const [records, setRecords] = useState<any[]>([])
  const [contests, setContests] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [recId, setRecId] = useState('')
  const [rankBy, setRankBy] = useState<'salary_initial' | 'salary_final'>('salary_initial')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const [r, c, a] = await Promise.all([
        supabase.from('salary_records').select('*, institutions(name, acronym, state)'),
        supabase.from('contests').select('*, institutions(name)'),
        supabase.from('attempts').select('correct, answered_at').order('answered_at'),
      ])
      const bad = [r, c, a].find((x) => x.error)
      if (bad?.error) return setErr(bad.error.message)
      setRecords(r.data ?? []); setContests(c.data ?? []); setAttempts(a.data ?? [])
      if (r.data?.length) setRecId(r.data[0].id)
    })()
  }, [])

  useEffect(() => {
    if (!recId) return
    supabase.from('salary_history').select('*').eq('salary_record_id', recId).order('year').then(({ data }) => setHistory(data ?? []))
  }, [recId])

  const label = (r: any) => `${r.institutions?.acronym ?? r.institutions?.name ?? ''} ${r.role_title}`.trim()
  const comparison = records.filter((r) => r.salary_initial || r.salary_final).map((r) => ({
    nome: `${r.institutions?.name ?? ''} · ${r.role_title}`, inicial: r.salary_initial ? Number(r.salary_initial) : null, final: r.salary_final ? Number(r.salary_final) : null,
  }))
  const ranking = useMemo(() => records.filter((r) => r[rankBy]).map((r) => ({ nome: `${r.institutions?.name ?? ''} · ${r.role_title}`, valor: Number(r[rankBy]) }))
    .sort((a, b) => b.valor - a.valor).slice(0, 10), [records, rankBy])

  const byState = useMemo(() => {
    const m: Record<string, number> = {}
    contests.forEach((c) => { const k = c.state ?? 'Nacional'; m[k] = (m[k] ?? 0) + 1 })
    return Object.entries(m).map(([uf, qtd]) => ({ uf, qtd }))
  }, [contests])
  const byInst = useMemo(() => {
    const m: Record<string, number> = {}
    contests.forEach((c) => { const k = c.institutions?.name ?? 'Outras'; m[k] = (m[k] ?? 0) + 1 })
    return Object.entries(m).map(([nome, qtd]) => ({ nome, qtd }))
  }, [contests])

  const perf = useMemo(() => {
    const m: Record<string, { t: number; ok: number }> = {}
    attempts.forEach((a) => { const d = new Date(a.answered_at).toLocaleDateString('pt-BR'); m[d] ??= { t: 0, ok: 0 }; m[d].t++; if (a.correct) m[d].ok++ })
    return Object.entries(m).map(([dia, v]) => ({ dia, acertos: Math.round((v.ok / v.t) * 100), questoes: v.t }))
  }, [attempts])

  return (
    <>
      <PageHeader title="Gráficos e estatísticas" subtitle="Calculados a partir dos dados cadastrados. Registros “em verificação” ou “desatualizados” aparecem com o mesmo peso; confira a situação na tela de salários." />
      {err && <ErrorBox message={err} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="1 · Comparação salarial" note="Salário inicial x final por cargo (final só aparece quando informado).">
          {comparison.length === 0 ? <Empty>Sem salários cadastrados.</Empty> : (
            <div className="h-72"><ResponsiveContainer><BarChart data={comparison}><CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="nome" {...axis} hide /><YAxis {...axis} tickFormatter={(v) => `${v / 1000}k`} /><Tooltip {...tip} formatter={(v: number) => brl(v)} /><Legend />
              <Bar dataKey="inicial" name="Inicial" fill={chartColors.brand} radius={[6, 6, 0, 0]} /><Bar dataKey="final" name="Final" fill={chartColors.gold} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
          )}
        </Box>

        <Box title="2 · Evolução salarial" note="Histórico por ano de uma carreira (cadastrado pelo administrador).">
          <select className="input mb-3" value={recId} onChange={(e) => setRecId(e.target.value)}>{records.map((r) => <option key={r.id} value={r.id}>{label(r)}</option>)}</select>
          {history.length === 0 ? <Empty>Esta carreira ainda não tem histórico anual cadastrado. Nada é estimado.</Empty> : (
            <div className="h-60"><ResponsiveContainer><LineChart data={history}><CartesianGrid stroke={chartColors.grid} /><XAxis dataKey="year" {...axis} /><YAxis {...axis} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip {...tip} formatter={(v: number) => brl(v)} /><Legend /><Line dataKey="salary_initial" name="Inicial" stroke={chartColors.brand} strokeWidth={2} /><Line dataKey="salary_final" name="Final" stroke={chartColors.gold} strokeWidth={2} /></LineChart></ResponsiveContainer></div>
          )}
        </Box>

        <Box title="3 · Concursos no Brasil" note="Quantidade de concursos cadastrados por estado e por instituição.">
          {contests.length === 0 ? <Empty>Sem concursos cadastrados.</Empty> : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-56"><ResponsiveContainer><BarChart data={byState}><CartesianGrid stroke={chartColors.grid} vertical={false} /><XAxis dataKey="uf" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Bar dataKey="qtd" name="Concursos" fill={chartColors.brand} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <div className="h-56"><ResponsiveContainer><BarChart data={byInst} layout="vertical"><CartesianGrid stroke={chartColors.grid} horizontal={false} /><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="nome" width={90} {...axis} /><Tooltip {...tip} /><Bar dataKey="qtd" name="Concursos" fill={chartColors.gold} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">Situações: {Object.values(CONTEST_STATUS).join(', ')}.</p>
        </Box>

        <Box title="4 · Desempenho nos estudos" note="Percentual de acertos por dia.">
          {perf.length === 0 ? <Empty>Responda questões na área de estudos para ver sua evolução.</Empty> : (
            <div className="h-60"><ResponsiveContainer><LineChart data={perf}><CartesianGrid stroke={chartColors.grid} /><XAxis dataKey="dia" {...axis} /><YAxis domain={[0, 100]} {...axis} unit="%" /><Tooltip {...tip} /><Line dataKey="acertos" name="% de acertos" stroke={chartColors.brand} strokeWidth={2} dot /></LineChart></ResponsiveContainer></div>
          )}
        </Box>

        <div className="lg:col-span-2">
          <Box title={`5 · Ranking salarial — ${rankBy === 'salary_initial' ? 'salários INICIAIS' : 'salários FINAIS'}`} note="Escolha abaixo se a comparação usa o salário inicial ou o final.">
            <div className="mb-3 flex gap-2">
              <button className={rankBy === 'salary_initial' ? 'btn-primary' : 'btn-ghost'} onClick={() => setRankBy('salary_initial')}>Iniciais</button>
              <button className={rankBy === 'salary_final' ? 'btn-primary' : 'btn-ghost'} onClick={() => setRankBy('salary_final')}>Finais</button>
            </div>
            {ranking.length === 0 ? <Empty>Sem valores {rankBy === 'salary_initial' ? 'iniciais' : 'finais'} cadastrados.</Empty> : (
              <div className="h-72"><ResponsiveContainer><BarChart data={ranking} layout="vertical"><CartesianGrid stroke={chartColors.grid} horizontal={false} /><XAxis type="number" {...axis} tickFormatter={(v) => `${v / 1000}k`} /><YAxis type="category" dataKey="nome" width={190} {...axis} /><Tooltip {...tip} formatter={(v: number) => brl(v)} /><Bar dataKey="valor" name="Valor" fill={chartColors.gold} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
            )}
          </Box>
        </div>
      </div>
    </>
  )
}
