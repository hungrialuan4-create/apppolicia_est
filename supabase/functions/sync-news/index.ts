// Busca notícias de concursos policiais em feeds RSS públicos e grava na tabela `news`.
// Fonte: Google Notícias (RSS de busca), que agrega veículos de imprensa. O link e o nome do veículo original
// são preservados em cada notícia. Para acrescentar fontes oficiais, inclua novas URLs de RSS em FEEDS.
import { authorize, cors, serviceClient } from '../_shared/auth.ts'

const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:14d')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`

// Ordem = prioridade pedida: PRF, PF, PM-GO, PC-GO, Polícia Penal-GO, Científica-GO, demais
const FEEDS: { q: string; priority: number; institution: string; state: string | null }[] = [
  { q: 'concurso PRF Polícia Rodoviária Federal', priority: 1, institution: 'PRF', state: null },
  { q: 'concurso Polícia Federal PF', priority: 2, institution: 'Polícia Federal', state: null },
  { q: 'concurso Polícia Militar Goiás PM GO', priority: 3, institution: 'PM-GO', state: 'GO' },
  { q: 'concurso Polícia Civil Goiás PC GO', priority: 4, institution: 'PC-GO', state: 'GO' },
  { q: 'concurso Polícia Penal Goiás', priority: 5, institution: 'Polícia Penal-GO', state: 'GO' },
  { q: 'concurso Polícia Científica Goiás', priority: 6, institution: 'Polícia Técnico-Científica-GO', state: 'GO' },
  { q: 'concurso polícia militar civil penal edital', priority: 7, institution: '', state: null },
]

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function categorize(t: string): string {
  const x = norm(t)
  if (/retifica/.test(x)) return 'retificações'
  if (/convoca/.test(x)) return 'convocações'
  if (/nomea|nomeacao/.test(x)) return 'nomeações'
  if (/resultado|gabarito|classificad|aprovad/.test(x)) return 'resultados'
  if (/reajuste|salari|remunera|aumento/.test(x)) return 'mudanças salariais'
  if (/inscri/.test(x)) return 'inscrições abertas'
  if (/edital/.test(x)) return 'editais publicados'
  if (/banca|cebraspe|cespe|fgv|aocp|vunesp|idecan/.test(x)) return 'bancas organizadoras'
  if (/autoriz/.test(x)) return 'concursos autorizados'
  if (/previst|solicit|pedido|estudos/.test(x)) return 'concursos previstos'
  if (/lei |projeto de lei|carreira|reestrutura/.test(x)) return 'leis e carreiras'
  return 'geral'
}

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
const strip = (s: string) => decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const tag = (item: string, name: string) => item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!(await authorize(req))) return new Response(JSON.stringify({ error: 'não autorizado' }), { status: 401, headers: { ...cors, 'content-type': 'application/json' } })

  const db = serviceClient()
  let total = 0
  const errors: string[] = []

  for (const f of FEEDS) {
    try {
      const res = await fetch(gnews(f.q), { headers: { 'user-agent': 'PoliciaBrasil/1.0' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]).slice(0, 15)
      const rows = items.map((it) => {
        const title = strip(tag(it, 'title'))
        const source = strip(tag(it, 'source'))
        const link = decode(tag(it, 'link')).trim()
        const pub = tag(it, 'pubDate')
        return {
          title: source && title.endsWith(` - ${source}`) ? title.slice(0, -(source.length + 3)) : title,
          summary: null as string | null, // o RSS só traz o título; o resumo pode ser editado pelo administrador
          category: categorize(title),
          institution_name: f.institution || null,
          state: f.state,
          published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
          source_name: source || 'Google Notícias',
          url: link,
          priority: f.priority,
          important: f.priority <= 2 && /edital|autoriz|inscri|retifica/.test(norm(title)),
        }
      }).filter((r) => r.url && r.title)
      if (rows.length) {
        const { error } = await db.from('news').upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
        if (error) throw error
        total += rows.length
      }
    } catch (e) {
      errors.push(`${f.institution || 'geral'}: ${(e as Error).message}`)
    }
  }

  await db.from('sync_logs').insert({
    job: 'sync-news', status: errors.length === 0 ? 'ok' : errors.length < FEEDS.length ? 'parcial' : 'erro',
    items: total, message: errors.join(' | ') || null,
  })
  return new Response(JSON.stringify({ items: total, errors }), { headers: { ...cors, 'content-type': 'application/json' } })
})
