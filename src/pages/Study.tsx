import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Empty, ErrorBox, PageHeader, Spinner } from '../components/ui'
import { useFavorites } from '../hooks/useFavorites'

const KIND_LABEL: Record<string, string> = { aula: 'Aulas', resumo: 'Resumos', apostila: 'Apostilas', mapa_mental: 'Mapas mentais' }
const DIFF: Record<string, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }
const LETTERS = ['A', 'B', 'C', 'D', 'E']

export default function Study() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [subject, setSubject] = useState<any | null>(null)
  const [tab, setTab] = useState<string>('questoes')
  const [items, setItems] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [style, setStyle] = useState('')
  const [diff, setDiff] = useState('')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [simulado, setSimulado] = useState<string[] | null>(null)
  const [stats, setStats] = useState<{ total: number; ok: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const { has, toggle } = useFavorites()

  useEffect(() => {
    supabase.from('subjects').select('*').order('sort_order').then(({ data, error }) => {
      if (error) setErr(error.message)
      setSubjects(data ?? []); setLoading(false)
    })
  }, [])

  const open = async (s: any) => {
    setSubject(s); setAnswers({}); setSimulado(null); setTab('questoes')
    const [i, q, a] = await Promise.all([
      supabase.from('study_items').select('*').eq('subject_id', s.id).order('topic'),
      supabase.from('questions').select('*').eq('subject_id', s.id),
      supabase.from('attempts').select('correct, questions!inner(subject_id)').eq('questions.subject_id', s.id),
    ])
    setItems(i.data ?? []); setQuestions(q.data ?? [])
    const att = a.data ?? []
    setStats({ total: att.length, ok: att.filter((x: any) => x.correct).length })
  }

  const answer = async (qu: any, idx: number) => {
    if (answers[qu.id] != null) return
    setAnswers((p) => ({ ...p, [qu.id]: idx }))
    const correct = idx === qu.correct_index
    setStats((s) => ({ total: (s?.total ?? 0) + 1, ok: (s?.ok ?? 0) + (correct ? 1 : 0) }))
    await supabase.from('attempts').insert({ question_id: qu.id, chosen_index: idx, correct })
  }

  const visible = useMemo(() => {
    let list = questions.filter((q) => (!style || q.style === style) && (!diff || q.difficulty === diff))
    if (simulado) list = questions.filter((q) => simulado.includes(q.id))
    return list
  }, [questions, style, diff, simulado])

  const startSimulado = () => {
    const pool = [...questions.filter((q) => (!style || q.style === style) && (!diff || q.difficulty === diff))]
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
    setAnswers({}); setSimulado(pool.slice(0, 10).map((q) => q.id))
  }

  const simDone = simulado && visible.length > 0 && visible.every((q) => answers[q.id] != null)
  const simScore = simulado ? visible.filter((q) => answers[q.id] === q.correct_index).length : 0

  if (loading) return <Spinner />

  if (!subject) return (
    <>
      <PageHeader title="Estudos" subtitle="Escolha uma disciplina." />
      {err && <ErrorBox message={err} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <button key={s.id} onClick={() => open(s)} className="card flex items-center justify-between text-left hover:ring-1 hover:ring-gold/40">
            <span className="font-semibold text-white">{s.name}</span>
            <span onClick={(e) => { e.stopPropagation(); toggle('subject', s.id, s.name) }} className={has('subject', s.id) ? 'text-gold' : 'text-slate-500'}>
              <Star size={18} fill={has('subject', s.id) ? 'currentColor' : 'none'} />
            </span>
          </button>
        ))}
      </div>
    </>
  )

  return (
    <>
      <PageHeader title={subject.name} subtitle={stats ? `Seu desempenho: ${stats.ok}/${stats.total} acertos${stats.total ? ` (${Math.round((stats.ok / stats.total) * 100)}%)` : ''}` : undefined}
        actions={<button className="btn-ghost" onClick={() => setSubject(null)}>← Disciplinas</button>} />

      <div className="mb-4 flex flex-wrap gap-2">
        {[['questoes', 'Questões'], ...Object.entries(KIND_LABEL)].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-brand text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{l}</button>
        ))}
      </div>

      {tab === 'questoes' ? (
        <>
          <div className="card mb-4 flex flex-wrap items-center gap-3">
            <select className="input !w-auto" value={style} onChange={(e) => { setStyle(e.target.value); setSimulado(null) }}>
              <option value="">Todos os estilos</option><option value="multipla_escolha">Múltipla escolha</option><option value="cebraspe">CEBRASPE (Certo/Errado)</option>
            </select>
            <select className="input !w-auto" value={diff} onChange={(e) => { setDiff(e.target.value); setSimulado(null) }}>
              <option value="">Todas as dificuldades</option>{Object.entries(DIFF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn-gold" onClick={startSimulado} disabled={questions.length === 0}>Gerar simulado (até 10)</button>
            {simulado && <button className="btn-ghost" onClick={() => { setSimulado(null); setAnswers({}) }}>Sair do simulado</button>}
          </div>
          {simDone && <div className="card mb-4 border-gold/40 text-white">Simulado concluído: <b>{simScore}</b> de {visible.length} ({Math.round((simScore / visible.length) * 100)}%).</div>}
          {visible.length === 0 ? <Empty>Nenhuma questão para este filtro. O administrador pode inserir questões no painel.</Empty> : (
            <div className="space-y-4">
              {visible.map((q, n) => {
                const chosen = answers[q.id]
                const done = chosen != null
                return (
                  <div key={q.id} className="card">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Questão {n + 1} · {q.style === 'cebraspe' ? 'CEBRASPE' : 'Múltipla escolha'} · {DIFF[q.difficulty]}{q.topic ? ` · ${q.topic}` : ''}</span>
                      <button onClick={() => toggle('question', q.id, q.statement.slice(0, 80))} className={has('question', q.id) ? 'text-gold' : 'text-slate-500'}><Star size={16} fill={has('question', q.id) ? 'currentColor' : 'none'} /></button>
                    </div>
                    <p className="text-white">{q.statement}</p>
                    <div className="mt-3 grid gap-2">
                      {(q.options as string[]).map((o, i) => {
                        const isRight = i === q.correct_index
                        const cls = !done ? 'border-white/10 hover:bg-white/5' : isRight ? 'border-emerald-500/50 bg-emerald-500/10' : i === chosen ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 opacity-70'
                        return (
                          <button key={i} onClick={() => answer(q, i)} className={`rounded-xl border px-3 py-2 text-left text-sm ${cls}`}>
                            {q.style === 'cebraspe' ? '' : `${LETTERS[i]}) `}{o}
                          </button>
                        )
                      })}
                    </div>
                    {done && (
                      <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm">
                        <b className={chosen === q.correct_index ? 'text-emerald-300' : 'text-red-300'}>{chosen === q.correct_index ? 'Correto.' : 'Incorreto.'}</b>{' '}
                        <span className="text-slate-300">Gabarito comentado: {q.explanation ?? 'sem comentário.'}</span>
                        {q.source && <div className="mt-1 text-xs text-slate-500">Fonte: {q.source}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        (() => {
          const list = items.filter((i) => i.kind === tab)
          return list.length === 0 ? <Empty>Nenhum conteúdo de “{KIND_LABEL[tab]}” cadastrado ainda para esta disciplina.</Empty> : (
            <div className="space-y-3">
              {list.map((i) => (
                <div key={i.id} className="card">
                  <div className="text-xs text-slate-500">{i.topic}</div>
                  <div className="font-semibold text-white">{i.title}</div>
                  {i.body && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{i.body}</p>}
                  {i.url && <a href={i.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-brand-soft hover:underline"><ExternalLink size={14} /> Abrir material</a>}
                </div>
              ))}
            </div>
          )
        })()
      )}
    </>
  )
}
