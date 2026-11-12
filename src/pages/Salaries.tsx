import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { brl, dateBR, normalize, SPHERE_LABEL, UFS } from '../lib/format'
import { Empty, ErrorBox, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { useFavorites } from '../hooks/useFavorites'

type Row = {
  key: string; instId: string; institution: string; kind: string; sphere: string; state: string | null
  role: string; rank: string | null; initial: number | null; final: number | null
  bonuses: string | null; benefits: string | null; education: string | null; workload: string | null
  status: string; refDate: string | null; sourceName: string | null; sourceUrl: string | null; updated: string | null; notes: string | null
}

const KINDS: Record<string, string> = { PF: 'Polícia Federal', PRF: 'PRF', PM: 'Polícia Militar', PC: 'Polícia Civil', PP: 'Polícia Penal', CIENTIFICA: 'Polícia Científica', GM: 'Guarda Municipal', LEGISLATIVA: 'Polícia Legislativa', OUTRA: 'Outras' }

export default function Salaries() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [sphere, setSphere] = useState('')
  const [kind, setKind] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [onlyData, setOnlyData] = useState(true)
  const [sort, setSort] = useState('initial_desc')
  const { has, toggle } = useFavorites()

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('institutions').select('*, salary_records(*)').order('name')
      if (error) { setErr(error.message); setLoading(false); return }
      const out: Row[] = []
      for (const i of data ?? []) {
        const base = { instId: i.id, institution: i.name, kind: i.kind, sphere: i.sphere, state: i.state }
        if (!i.salary_records?.length) {
          out.push({ ...base, key: i.id, role: '—', rank: null, initial: null, final: null, bonuses: null, benefits: null, education: null, workload: null,
            status: 'nao_confirmado', refDate: null, sourceName: null, sourceUrl: i.official_site, updated: null, notes: null })
        } else for (const r of i.salary_records) {
          out.push({ ...base, key: r.id, role: r.role_title, rank: r.rank_class, initial: r.salary_initial == null ? null : Number(r.salary_initial),
            final: r.salary_final == null ? null : Number(r.salary_final), bonuses: r.bonuses, benefits: r.benefits, education: r.education, workload: r.workload,
            status: r.status, refDate: r.reference_date, sourceName: r.source_name, sourceUrl: r.source_url, updated: r.updated_at, notes: r.notes })
        }
      }
      setRows(out); setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const nq = normalize(q.trim())
    const minV = min ? Number(min) : null, maxV = max ? Number(max) : null
    let list = rows.filter((r) => {
      if (onlyData && r.initial == null && r.final == null) return false
      if (state && r.state !== state) return false
      if (sphere && r.sphere !== sphere) return false
      if (kind && r.kind !== kind) return false
      const v = r.initial ?? r.final
      if (minV != null && (v == null || v < minV)) return false
      if (maxV != null && (v == null || v > maxV)) return false
      if (!nq) return true
      const hay = normalize([r.institution, r.state, r.role, r.rank, r.initial, r.final, r.education].join(' '))
      return hay.includes(nq)
    })
    const val = (r: Row, k: 'initial' | 'final') => r[k] ?? -1
    list = [...list].sort((a, b) =>
      sort === 'initial_desc' ? val(b, 'initial') - val(a, 'initial')
      : sort === 'initial_asc' ? (a.initial ?? Infinity) - (b.initial ?? Infinity)
      : sort === 'final_desc' ? val(b, 'final') - val(a, 'final')
      : sort === 'final_asc' ? (a.final ?? Infinity) - (b.final ?? Infinity)
      : a.institution.localeCompare(b.institution))
    return list
  }, [rows, q, state, sphere, kind, min, max, onlyData, sort])

  return (
    <>
      <PageHeader title="Salários das polícias" subtitle="Cada valor mostra fonte, data de referência e situação. Sem fonte confirmada, aparece “Dados não confirmados”." />
      {err && <ErrorBox message={err} />}

      <div className="card mb-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Buscar por polícia, estado, cargo, classe/patente ou salário…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <select className="input" value={state} onChange={(e) => setState(e.target.value)}><option value="">Estado</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
          <select className="input" value={sphere} onChange={(e) => setSphere(e.target.value)}><option value="">Esfera</option>{Object.entries(SPHERE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Instituição</option>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input className="input" type="number" placeholder="Salário mín." value={min} onChange={(e) => setMin(e.target.value)} />
          <input className="input" type="number" placeholder="Salário máx." value={max} onChange={(e) => setMax(e.target.value)} />
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="initial_desc">Maior salário inicial</option>
            <option value="initial_asc">Menor salário inicial</option>
            <option value="final_desc">Maior salário final</option>
            <option value="final_asc">Menor salário final</option>
            <option value="name">Nome da instituição</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="accent-blue-500" checked={onlyData} onChange={(e) => setOnlyData(e.target.checked)} />
          Mostrar só registros com valor (desmarque para ver instituições com “Dados não confirmados”)
        </label>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty>Nenhum resultado para os filtros atuais.</Empty> : (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">{filtered.length} registro(s)</div>
          {filtered.map((r) => (
            <div key={r.key} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-white">{r.institution}{r.state ? ` · ${r.state}` : ''}</div>
                  <div className="text-sm text-slate-300">{r.role}{r.rank ? ` — ${r.rank}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <button onClick={() => toggle('institution', r.instId, r.institution)} aria-label="Favoritar instituição"
                    className={`rounded-lg p-1.5 hover:bg-white/5 ${has('institution', r.instId) ? 'text-gold' : 'text-slate-500'}`}><Star size={18} fill={has('institution', r.instId) ? 'currentColor' : 'none'} /></button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div><div className="label">Inicial</div><div className="font-bold text-white">{brl(r.initial)}</div></div>
                <div><div className="label">Final</div><div className="font-bold text-white">{brl(r.final)}</div></div>
                <div><div className="label">Escolaridade</div><div>{r.education ?? 'Dados não confirmados'}</div></div>
                <div><div className="label">Jornada</div><div>{r.workload ?? 'Dados não confirmados'}</div></div>
                <div><div className="label">Gratificações</div><div>{r.bonuses ?? 'Dados não confirmados'}</div></div>
                <div><div className="label">Benefícios</div><div>{r.benefits ?? 'Dados não confirmados'}</div></div>
                <div><div className="label">Data de referência</div><div>{dateBR(r.refDate)}</div></div>
                <div><div className="label">Última atualização</div><div>{dateBR(r.updated)}</div></div>
              </div>
              {r.notes && <p className="mt-3 text-xs text-slate-400">{r.notes}</p>}
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                Fonte: {r.sourceName ?? 'não informada'}
                {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-soft hover:underline"><ExternalLink size={12} /> abrir</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
