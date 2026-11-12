import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CONTEST_STATUS, dateBR, normalize } from '../lib/format'
import { Empty, ErrorBox, PageHeader, Spinner } from '../components/ui'
import { useFavorites } from '../hooks/useFavorites'

export const NEWS_CATEGORIES = [
  'concursos autorizados', 'concursos previstos', 'editais publicados', 'inscrições abertas', 'bancas organizadoras',
  'convocações', 'nomeações', 'resultados', 'retificações', 'mudanças salariais', 'leis e carreiras', 'geral',
]

export default function News() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [syncing, setSyncing] = useState(false)
  const { has, toggle } = useFavorites()

  const load = async () => {
    const { data, error } = await supabase.from('news').select('*').order('priority').order('published_at', { ascending: false }).limit(200)
    if (error) setErr(error.message)
    setItems(data ?? []); setLoading(false)
  }
  const [contests, setContests] = useState<any[]>([])
  useEffect(() => {
    load()
    supabase.from('contests').select('*').order('created_at', { ascending: false }).then(({ data }) => setContests(data ?? []))
  }, [])

  const refresh = async () => {
    setSyncing(true); setErr(null)
    const { error } = await supabase.functions.invoke('sync-news')
    if (error) setErr('A atualização manual é só para administradores ou a função sync-news ainda não foi publicada.')
    await load(); setSyncing(false)
  }

  const list = useMemo(() => items.filter((n) =>
    (!cat || n.category === cat) && (!q || normalize(`${n.title} ${n.summary ?? ''} ${n.institution_name ?? ''}`).includes(normalize(q)))), [items, q, cat])

  return (
    <>
      <PageHeader title="Notícias e concursos" subtitle="Ordenadas por prioridade: PRF, PF, PM-GO, PC-GO, Polícia Penal-GO, Científica-GO e demais."
        actions={<button className="btn-ghost" onClick={refresh} disabled={syncing}>{syncing ? 'Atualizando…' : 'Atualizar agora'}</button>} />
      {err && <ErrorBox message={err} />}
      <div className="card mb-4 grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Buscar notícia…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {NEWS_CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>
      {contests.length > 0 && (
        <div className="card mb-4">
          <h2 className="mb-2 font-semibold text-white">Concursos</h2>
          <ul className="divide-y divide-white/5 text-sm">
            {contests.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <div className="font-medium text-white">{c.title}</div>
                  <div className="text-xs text-slate-400">{CONTEST_STATUS[c.status] ?? c.status}{c.vacancies ? ` · ${c.vacancies} vagas` : ''}{c.organizer ? ` · Banca: ${c.organizer}` : ''}{!c.verified ? ' · não verificado em fonte oficial' : ''}</div>
                  {c.notes && <div className="text-xs text-slate-500">{c.notes}</div>}
                  {c.source_url && <a href={c.source_url} target="_blank" rel="noreferrer" className="text-xs text-brand-soft hover:underline">fonte</a>}
                </div>
                <button onClick={() => toggle('contest', c.id, c.title)} aria-label="Favoritar concurso" className={has('contest', c.id) ? 'text-gold' : 'text-slate-500'}><Star size={18} fill={has('contest', c.id) ? 'currentColor' : 'none'} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {loading ? <Spinner /> : list.length === 0 ? <Empty>Nenhuma notícia ainda. Publique pelo painel admin ou execute a rotina de atualização.</Empty> : (
        <div className="space-y-3">
          {list.map((n) => (
            <article key={n.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
                    {n.priority <= 6 && <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold">Prioridade {n.priority}</span>}
                    <span className="rounded-full bg-brand/15 px-2 py-0.5 text-brand-soft">{n.category}</span>
                    {n.important && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-300">Importante</span>}
                  </div>
                  <a href={n.url} target="_blank" rel="noreferrer" className="font-semibold text-white hover:text-gold-soft">{n.title}</a>
                  {n.summary && <p className="mt-1 text-sm text-slate-300">{n.summary}</p>}
                  <div className="mt-2 text-xs text-slate-500">
                    {n.institution_name ?? 'Geral'}{n.state ? ` · ${n.state}` : ''} · {dateBR(n.published_at)} · Fonte: {n.source_name ?? '—'}
                    <a href={n.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-brand-soft hover:underline"><ExternalLink size={12} /> original</a>
                  </div>
                </div>
                <button onClick={() => toggle('news', n.id, n.title)} aria-label="Favoritar notícia"
                  className={`rounded-lg p-1.5 hover:bg-white/5 ${has('news', n.id) ? 'text-gold' : 'text-slate-500'}`}><Star size={18} fill={has('news', n.id) ? 'currentColor' : 'none'} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
