import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { brl, dateBR, UFS } from '../lib/format'
import { chartColors, Empty, ErrorBox, PageHeader, StatusBadge } from '../components/ui'

export default function CareerCalc() {
  const [insts, setInsts] = useState<any[]>([])
  const [state, setState] = useState('')
  const [instId, setInstId] = useState('')
  const [recId, setRecId] = useState('')
  const [steps, setSteps] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('institutions').select('*, salary_records(*)').order('name').then(({ data, error }) => {
      if (error) setErr(error.message)
      setInsts(data ?? [])
    })
  }, [])

  const filteredInsts = useMemo(() => insts.filter((i) => !state || i.state === state || (!i.state && i.sphere === 'federal')), [insts, state])
  const inst = insts.find((i) => i.id === instId)
  const rec = inst?.salary_records?.find((r: any) => r.id === recId)

  useEffect(() => { setInstId(''); setRecId('') }, [state])
  useEffect(() => { setRecId('') }, [instId])
  useEffect(() => {
    if (!recId) return setSteps([])
    supabase.from('career_steps').select('*').eq('salary_record_id', recId).order('step_order').then(({ data }) => setSteps(data ?? []))
  }, [recId])

  return (
    <>
      <PageHeader title="Calculadora de carreira" subtitle="Usa somente os valores cadastrados, sempre com fonte e situação. Nada é estimado." />
      {err && <ErrorBox message={err} />}
      <div className="card mb-4 grid gap-3 sm:grid-cols-3">
        <div><label className="label">Estado (opcional)</label>
          <select className="input" value={state} onChange={(e) => setState(e.target.value)}><option value="">Todos / federais</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></div>
        <div><label className="label">Instituição</label>
          <select className="input" value={instId} onChange={(e) => setInstId(e.target.value)}><option value="">Selecione…</option>{filteredInsts.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
        <div><label className="label">Cargo / classe</label>
          <select className="input" value={recId} onChange={(e) => setRecId(e.target.value)} disabled={!inst}>
            <option value="">Selecione…</option>{inst?.salary_records?.map((r: any) => <option key={r.id} value={r.id}>{r.role_title}{r.rank_class ? ` — ${r.rank_class}` : ''}</option>)}</select></div>
      </div>

      {inst && !inst.salary_records?.length && <Empty>Dados não confirmados para {inst.name}. Nenhum cargo cadastrado ainda.</Empty>}

      {rec && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><div className="font-semibold text-white">{inst.name} — {rec.role_title}</div><div className="text-sm text-slate-400">{rec.rank_class}</div></div>
            <StatusBadge status={rec.status} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="label">Salário inicial</div><div className="text-2xl font-extrabold text-white">{brl(rec.salary_initial)}</div></div>
            <div><div className="label">Remuneração final</div><div className="text-2xl font-extrabold text-gold">{brl(rec.salary_final)}</div></div>
          </div>
          {rec.salary_initial && rec.salary_final && (
            <div className="text-sm text-slate-300">Crescimento ao longo da carreira: <b className="text-white">{(((rec.salary_final - rec.salary_initial) / rec.salary_initial) * 100).toFixed(1)}%</b></div>
          )}
          <div>
            <div className="label">Progressão na carreira</div>
            {steps.length === 0 ? <p className="text-sm text-slate-400">Progressão não cadastrada (Dados não confirmados).</p> : (
              <>
                <ol className="space-y-1 text-sm">
                  {steps.map((s) => <li key={s.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-2"><span>{s.step_label}</span><b className="text-white">{brl(s.amount)}</b></li>)}
                </ol>
                <div className="mt-3 h-48"><ResponsiveContainer><LineChart data={steps}><CartesianGrid stroke={chartColors.grid} /><XAxis dataKey="step_label" hide /><YAxis tick={{ fill: chartColors.text, fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: '#0e1729', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} /><Line dataKey="amount" name="Remuneração" stroke={chartColors.gold} strokeWidth={2} dot /></LineChart></ResponsiveContainer></div>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500">
            Referência: {dateBR(rec.reference_date)} · Fonte: {rec.source_name ?? 'não informada'}{' '}
            {rec.source_url && <a className="text-brand-soft hover:underline" href={rec.source_url} target="_blank" rel="noreferrer">abrir fonte</a>}
          </div>
        </div>
      )}
    </>
  )
}
