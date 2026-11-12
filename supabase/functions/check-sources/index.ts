// Verifica se os links de fonte dos salários continuam acessíveis e registra o resultado.
// ATENÇÃO: isto confere o LINK, não o valor. Valores só passam a "confirmado" quando um administrador
// compara a fonte oficial (Portal da Transparência, tabela do MGI, Diário Oficial, edital) e muda a situação.
import { authorize, cors, serviceClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!(await authorize(req))) return new Response(JSON.stringify({ error: 'não autorizado' }), { status: 401, headers: { ...cors, 'content-type': 'application/json' } })

  const db = serviceClient()
  const { data, error } = await db.from('salary_records').select('id, source_url').not('source_url', 'is', null)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, 'content-type': 'application/json' } })

  let ok = 0
  for (const r of data ?? []) {
    let good = false
    try {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), 10000)
      const res = await fetch(r.source_url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'PoliciaBrasil/1.0' } })
      clearTimeout(t)
      good = res.ok
    } catch { good = false }
    if (good) ok++
    await db.from('salary_records').update({ source_ok: good, source_checked_at: new Date().toISOString() }).eq('id', r.id)
  }

  await db.from('sync_logs').insert({ job: 'check-sources', status: ok === (data?.length ?? 0) ? 'ok' : 'parcial', items: data?.length ?? 0, message: `${ok} link(s) acessível(is)` })
  return new Response(JSON.stringify({ checked: data?.length ?? 0, ok }), { headers: { ...cors, 'content-type': 'application/json' } })
})
