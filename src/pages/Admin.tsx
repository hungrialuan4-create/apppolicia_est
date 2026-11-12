import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { dateBR } from '../lib/format'
import { Empty, ErrorBox, PageHeader, Spinner } from '../components/ui'
import { useAuth } from '../auth/AuthProvider'

type Field = {
  name: string; label: string
  type?: 'text' | 'number' | 'textarea' | 'date' | 'checkbox' | 'select' | 'ref' | 'lines'
  options?: [string, string][]; refTable?: string; refLabel?: string; required?: boolean
}
type Cfg = { table: string; title: string; columns: string[]; fields: Field[]; order?: string }

const STATUS_OPTS: [string, string][] = [['confirmado', 'Confirmado'], ['em_verificacao', 'Em verificação'], ['desatualizado', 'Desatualizado'], ['nao_confirmado', 'Dados não confirmados']]

const CONFIGS: Record<string, Cfg> = {
  institutions: { table: 'institutions', title: 'Instituições', columns: ['name', 'kind', 'sphere', 'state'], order: 'name', fields: [
    { name: 'name', label: 'Nome', required: true }, { name: 'acronym', label: 'Sigla' },
    { name: 'kind', label: 'Tipo', type: 'select', required: true, options: [['PF', 'PF'], ['PRF', 'PRF'], ['PM', 'PM'], ['PC', 'PC'], ['PP', 'Polícia Penal'], ['CIENTIFICA', 'Científica'], ['GM', 'Guarda Municipal'], ['LEGISLATIVA', 'Legislativa'], ['OUTRA', 'Outra']] },
    { name: 'sphere', label: 'Esfera', type: 'select', required: true, options: [['federal', 'Federal'], ['estadual', 'Estadual'], ['distrital', 'Distrital'], ['municipal', 'Municipal']] },
    { name: 'state', label: 'UF (2 letras)' }, { name: 'official_site', label: 'Site oficial' }] },
  salary_records: { table: 'salary_records', title: 'Salários', columns: ['role_title', 'salary_initial', 'salary_final', 'status', 'reference_date', 'source_ok'], order: 'updated_at', fields: [
    { name: 'institution_id', label: 'Instituição', type: 'ref', refTable: 'institutions', refLabel: 'name', required: true },
    { name: 'role_title', label: 'Cargo', required: true }, { name: 'rank_class', label: 'Classe / patente' },
    { name: 'salary_initial', label: 'Salário inicial (R$)', type: 'number' }, { name: 'salary_final', label: 'Salário final (R$)', type: 'number' },
    { name: 'bonuses', label: 'Gratificações e adicionais', type: 'textarea' }, { name: 'benefits', label: 'Benefícios', type: 'textarea' },
    { name: 'education', label: 'Escolaridade' }, { name: 'workload', label: 'Jornada' },
    { name: 'status', label: 'Situação da informação', type: 'select', required: true, options: STATUS_OPTS },
    { name: 'reference_date', label: 'Data de referência', type: 'date' }, { name: 'source_name', label: 'Nome da fonte' }, { name: 'source_url', label: 'Link da fonte oficial' },
    { name: 'notes', label: 'Observações', type: 'textarea' }] },
  career_steps: { table: 'career_steps', title: 'Progressão', columns: ['step_order', 'step_label', 'amount'], order: 'step_order', fields: [
    { name: 'salary_record_id', label: 'Registro salarial', type: 'ref', refTable: 'salary_records', refLabel: 'role_title', required: true },
    { name: 'step_order', label: 'Ordem', type: 'number', required: true }, { name: 'step_label', label: 'Classe / padrão', required: true },
    { name: 'amount', label: 'Valor (R$)', type: 'number', required: true }, { name: 'source_url', label: 'Fonte' }] },
  salary_history: { table: 'salary_history', title: 'Histórico anual', columns: ['year', 'salary_initial', 'salary_final'], order: 'year', fields: [
    { name: 'salary_record_id', label: 'Registro salarial', type: 'ref', refTable: 'salary_records', refLabel: 'role_title', required: true },
    { name: 'year', label: 'Ano', type: 'number', required: true }, { name: 'salary_initial', label: 'Inicial (R$)', type: 'number' },
    { name: 'salary_final', label: 'Final (R$)', type: 'number' }, { name: 'source_url', label: 'Fonte' }] },
  contests: { table: 'contests', title: 'Concursos', columns: ['title', 'status', 'vacancies', 'state', 'verified'], order: 'created_at', fields: [
    { name: 'institution_id', label: 'Instituição', type: 'ref', refTable: 'institutions', refLabel: 'name' }, { name: 'title', label: 'Título', required: true },
    { name: 'status', label: 'Situação', type: 'select', required: true, options: [['autorizado', 'Autorizado'], ['previsto', 'Previsto'], ['edital_publicado', 'Edital publicado'], ['inscricoes_abertas', 'Inscrições abertas'], ['em_andamento', 'Em andamento'], ['encerrado', 'Encerrado']] },
    { name: 'vacancies', label: 'Vagas', type: 'number' }, { name: 'organizer', label: 'Banca' }, { name: 'state', label: 'UF' },
    { name: 'reference_date', label: 'Data de referência', type: 'date' }, { name: 'source_url', label: 'Fonte' }, { name: 'notes', label: 'Observações', type: 'textarea' },
    { name: 'verified', label: 'Verificado em fonte oficial', type: 'checkbox' }] },
  news: { table: 'news', title: 'Notícias', columns: ['title', 'category', 'institution_name', 'priority', 'important'], order: 'published_at', fields: [
    { name: 'title', label: 'Título', required: true }, { name: 'summary', label: 'Resumo', type: 'textarea' },
    { name: 'category', label: 'Categoria', required: true }, { name: 'institution_name', label: 'Instituição' }, { name: 'state', label: 'UF' },
    { name: 'source_name', label: 'Fonte' }, { name: 'url', label: 'Link da notícia original', required: true },
    { name: 'priority', label: 'Prioridade (1 PRF … 7 demais)', type: 'number' }, { name: 'important', label: 'Importante (envia notificação)', type: 'checkbox' }] },
  subjects: { table: 'subjects', title: 'Disciplinas', columns: ['name', 'slug', 'sort_order'], order: 'sort_order', fields: [
    { name: 'name', label: 'Nome', required: true }, { name: 'slug', label: 'Slug (sem espaços)', required: true }, { name: 'sort_order', label: 'Ordem', type: 'number' }] },
  study_items: { table: 'study_items', title: 'Conteúdo de estudo', columns: ['title', 'kind', 'topic'], order: 'created_at', fields: [
    { name: 'subject_id', label: 'Disciplina', type: 'ref', refTable: 'subjects', refLabel: 'name', required: true },
    { name: 'kind', label: 'Tipo', type: 'select', required: true, options: [['aula', 'Aula'], ['resumo', 'Resumo'], ['apostila', 'Apostila'], ['mapa_mental', 'Mapa mental']] },
    { name: 'topic', label: 'Assunto', required: true }, { name: 'title', label: 'Título', required: true },
    { name: 'body', label: 'Texto', type: 'textarea' }, { name: 'url', label: 'Link do material' }] },
  questions: { table: 'questions', title: 'Questões', columns: ['statement', 'style', 'difficulty'], order: 'created_at', fields: [
    { name: 'subject_id', label: 'Disciplina', type: 'ref', refTable: 'subjects', refLabel: 'name', required: true }, { name: 'topic', label: 'Assunto' },
    { name: 'style', label: 'Estilo', type: 'select', required: true, options: [['multipla_escolha', 'Múltipla escolha'], ['cebraspe', 'CEBRASPE']] },
    { name: 'difficulty', label: 'Dificuldade', type: 'select', required: true, options: [['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil']] },
    { name: 'statement', label: 'Enunciado', type: 'textarea', required: true },
    { name: 'options', label: 'Alternativas (uma por linha; CEBRASPE: Certo / Errado)', type: 'lines', required: true },
    { name: 'correct_index', label: 'Índice correto (0 = primeira)', type: 'number', required: true },
    { name: 'explanation', label: 'Gabarito comentado', type: 'textarea' }, { name: 'source', label: 'Fonte / banca / ano' }] },
}

const TABS = [...Object.keys(CONFIGS), 'users', 'settings', 'logs']
const TAB_LABEL: Record<string, string> = { users: 'Usuários e permissões', settings: 'Acesso', logs: 'Logs e histórico' }

function Crud({ cfg }: { cfg: Cfg }) {
  const [rows, setRows] = useState<any[]>([])
  const [refs, setRefs] = useState<Record<string, any[]>>({})
  const [editing, setEditing] = useState<any | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from(cfg.table).select('*').order(cfg.order ?? 'created_at', { ascending: false }).limit(300)
    if (error) setErr(error.message)
    setRows(data ?? []); setLoading(false)
    const r: Record<string, any[]> = {}
    for (const f of cfg.fields) if (f.type === 'ref' && f.refTable) {
      const res = await supabase.from(f.refTable).select('*').limit(1000)
      r[f.name] = res.data ?? []
    }
    setRefs(r)
  }, [cfg])
  useEffect(() => { setEditing(null); setErr(null); setMsg(null); load() }, [load])

  const save = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    const payload: any = {}
    for (const f of cfg.fields) {
      let v = editing[f.name]
      if (f.type === 'number') v = v === '' || v == null ? null : Number(v)
      else if (f.type === 'checkbox') v = Boolean(v)
      else if (f.type === 'lines') v = Array.isArray(v) ? v : String(v ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
      else if (v === '') v = null
      if (f.name === 'state' && typeof v === 'string') v = v.toUpperCase()
      payload[f.name] = v
    }
    const q = editing.id ? supabase.from(cfg.table).update(payload).eq('id', editing.id) : supabase.from(cfg.table).insert(payload)
    const { error } = await q
    if (error) return setErr(error.message)
    setEditing(null); setMsg('Salvo.'); load()
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir este registro? A ação fica no histórico de alterações.')) return
    const { error } = await supabase.from(cfg.table).delete().eq('id', id)
    if (error) setErr(error.message); else load()
  }

  const show = (r: any, c: string) => {
    const v = r[c]
    if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
    if (c.includes('date')) return dateBR(v)
    if (typeof v === 'string' && v.length > 70) return v.slice(0, 70) + '…'
    return v ?? '—'
  }

  const verifySources = async () => {
    setMsg('Verificando fontes…')
    const { data, error } = await supabase.functions.invoke('check-sources')
    setMsg(error ? 'Função check-sources não publicada ou sem permissão.' : `Fontes verificadas: ${data?.checked ?? 0} (links ok: ${data?.ok ?? 0}).`)
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">{cfg.title}</h2>
        <div className="flex gap-2">
          {cfg.table === 'salary_records' && <button className="btn-ghost" onClick={verifySources}>Verificar fontes</button>}
          <button className="btn-primary" onClick={() => setEditing(Object.fromEntries(cfg.fields.map((f) => [f.name, f.type === 'checkbox' ? false : ''])))}><Plus size={16} /> Novo</button>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {msg && <div className="text-sm text-emerald-300">{msg}</div>}

      {editing && (
        <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2">
          {cfg.fields.map((f) => (
            <div key={f.name} className={f.type === 'textarea' || f.type === 'lines' ? 'sm:col-span-2' : ''}>
              <label className="label">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea' ? <textarea className="input min-h-[80px]" value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} required={f.required} />
              : f.type === 'lines' ? <textarea className="input min-h-[100px]" value={Array.isArray(editing[f.name]) ? editing[f.name].join('\n') : editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} required={f.required} />
              : f.type === 'checkbox' ? <input type="checkbox" className="accent-blue-500" checked={Boolean(editing[f.name])} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.checked })} />
              : f.type === 'select' ? <select className="input" value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} required={f.required}><option value="">Selecione…</option>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : f.type === 'ref' ? <select className="input" value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} required={f.required}><option value="">Selecione…</option>{(refs[f.name] ?? []).map((o) => <option key={o.id} value={o.id}>{o[f.refLabel!]}{o.state ? ` (${o.state})` : ''}</option>)}</select>
              : <input className="input" type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} step={f.type === 'number' ? 'any' : undefined} value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} required={f.required} />}
            </div>
          ))}
          <div className="flex gap-2 sm:col-span-2"><button className="btn-primary">Salvar</button><button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancelar</button></div>
        </form>
      )}

      {loading ? <Spinner /> : rows.length === 0 ? <Empty>Nenhum registro.</Empty> : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[640px]">
            <thead><tr className="border-b border-white/10">{cfg.columns.map((c) => <th key={c} className="th">{cfg.fields.find((f) => f.name === c)?.label ?? c}</th>)}<th className="th" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  {cfg.columns.map((c) => <td key={c} className="td">{show(r, c)}</td>)}
                  <td className="td whitespace-nowrap text-right">
                    <button onClick={() => setEditing(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Editar"><Pencil size={15} /></button>
                    <button onClick={() => remove(r.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-red-300" aria-label="Excluir"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Users() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (error) setErr(error.message); setRows(data ?? [])
  }, [])
  useEffect(() => { load() }, [load])
  const patch = async (id: string, p: any) => { const { error } = await supabase.from('profiles').update(p).eq('id', id); if (error) setErr(error.message); load() }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-white">Usuários</h2>
      {err && <ErrorBox message={err} />}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[560px]">
          <thead><tr className="border-b border-white/10"><th className="th">E-mail</th><th className="th">Nome</th><th className="th">Permissão</th><th className="th">Acesso</th></tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u.id} className="border-b border-white/5">
              <td className="td">{u.email}</td><td className="td">{u.full_name ?? '—'}</td>
              <td className="td"><select className="input !w-auto" value={u.role} disabled={u.id === profile?.id} onChange={(e) => patch(u.id, { role: e.target.value })}><option value="user">Usuário</option><option value="admin">Administrador</option></select></td>
              <td className="td"><button className={u.approved ? 'btn-ghost' : 'btn-gold'} disabled={u.id === profile?.id} onClick={() => patch(u.id, { approved: !u.approved })}>{u.approved ? 'Bloquear' : 'Liberar'}</button></td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}

function Settings() {
  const [allow, setAllow] = useState(false)
  const [emails, setEmails] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(async () => {
    const [s, e] = await Promise.all([supabase.from('app_settings').select('*').eq('key', 'allow_signups').maybeSingle(), supabase.from('allowed_emails').select('*').order('created_at')])
    setAllow(Boolean(s.data?.value)); setEmails(e.data ?? [])
  }, [])
  useEffect(() => { load() }, [load])

  const toggle = async () => {
    const { error } = await supabase.from('app_settings').upsert({ key: 'allow_signups', value: !allow, updated_at: new Date().toISOString() })
    if (error) setErr(error.message); load()
  }
  const add = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('allowed_emails').insert({ email: email.trim().toLowerCase() })
    if (error) setErr(error.message); setEmail(''); load()
  }

  return (
    <div className="space-y-4">
      {err && <ErrorBox message={err} />}
      <div className="card flex items-center justify-between gap-3">
        <div><div className="font-semibold text-white">Cadastros abertos</div><div className="text-sm text-slate-400">{allow ? 'Qualquer pessoa pode criar conta.' : 'Somente e-mails autorizados abaixo podem criar conta.'}</div></div>
        <button className={allow ? 'btn-ghost' : 'btn-gold'} onClick={toggle}>{allow ? 'Bloquear novos cadastros' : 'Abrir cadastros'}</button>
      </div>
      <div className="card space-y-3">
        <div className="font-semibold text-white">E-mails autorizados</div>
        <form onSubmit={add} className="flex gap-2"><input className="input" type="email" required placeholder="pessoa@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /><button className="btn-primary">Autorizar</button></form>
        <ul className="divide-y divide-white/5 text-sm">{emails.map((m) => (
          <li key={m.email} className="flex items-center justify-between py-2">{m.email}
            <button className="text-slate-500 hover:text-red-300" onClick={async () => { await supabase.from('allowed_emails').delete().eq('email', m.email); load() }}><Trash2 size={15} /></button></li>))}
          {emails.length === 0 && <li className="py-2 text-slate-500">Nenhum e-mail autorizado.</li>}</ul>
      </div>
    </div>
  )
}

function Logs() {
  const [sync, setSync] = useState<any[]>([])
  const [audit, setAudit] = useState<any[]>([])
  useEffect(() => {
    supabase.from('sync_logs').select('*').order('ran_at', { ascending: false }).limit(30).then(({ data }) => setSync(data ?? []))
    supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(60).then(({ data }) => setAudit(data ?? []))
  }, [])
  return (
    <div className="space-y-4">
      <div className="card"><h2 className="mb-2 font-semibold text-white">Rotinas automáticas</h2>
        {sync.length === 0 ? <p className="text-sm text-slate-400">Nenhuma execução registrada.</p> : (
          <ul className="divide-y divide-white/5 text-sm">{sync.map((l) => <li key={l.id} className="py-2"><b className={l.status === 'ok' ? 'text-emerald-300' : 'text-red-300'}>{l.status}</b> · {l.job} · {l.items} itens · {new Date(l.ran_at).toLocaleString('pt-BR')}{l.message && <div className="text-xs text-slate-500">{l.message}</div>}</li>)}</ul>)}
      </div>
      <div className="card"><h2 className="mb-2 font-semibold text-white">Histórico de alterações</h2>
        {audit.length === 0 ? <p className="text-sm text-slate-400">Sem alterações registradas.</p> : (
          <ul className="divide-y divide-white/5 text-sm">{audit.map((a) => <li key={a.id} className="py-2">{new Date(a.created_at).toLocaleString('pt-BR')} · <b>{a.action}</b> em {a.table_name}
            <details className="text-xs text-slate-500"><summary className="cursor-pointer">detalhes</summary><pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify({ antes: a.old_data, depois: a.new_data }, null, 2)}</pre></details></li>)}</ul>)}
      </div>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('institutions')
  return (
    <>
      <PageHeader title="Painel administrativo" subtitle="Cadastros, usuários, permissões, logs e histórico." />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${tab === t ? 'bg-gold text-ink' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{CONFIGS[t]?.title ?? TAB_LABEL[t]}</button>)}
      </div>
      {CONFIGS[tab] ? <Crud cfg={CONFIGS[tab]} /> : tab === 'users' ? <Users /> : tab === 'settings' ? <Settings /> : <Logs />}
    </>
  )
}
