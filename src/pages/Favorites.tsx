import { Trash2 } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { supabase } from '../lib/supabase'
import { Empty, PageHeader } from '../components/ui'
import { dateBR } from '../lib/format'

const GROUPS: [string, string][] = [
  ['institution', 'Instituições'], ['contest', 'Concursos de interesse'], ['news', 'Notícias'], ['subject', 'Disciplinas'], ['question', 'Questões'],
]

export default function Favorites() {
  const { favs, reload } = useFavorites()
  const remove = async (id: string) => { await supabase.from('favorites').delete().eq('id', id); reload() }

  return (
    <>
      <PageHeader title="Favoritos" subtitle="Use a estrela nas telas de salários, notícias, estudos e concursos." />
      {favs.length === 0 && <Empty>Você ainda não salvou nada.</Empty>}
      <div className="space-y-4">
        {GROUPS.map(([kind, title]) => {
          const list = favs.filter((f) => f.kind === kind)
          if (!list.length) return null
          return (
            <div key={kind} className="card">
              <h2 className="mb-2 font-semibold text-white">{title}</h2>
              <ul className="divide-y divide-white/5">
                {list.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{f.label ?? f.ref_id} <span className="text-xs text-slate-500">· salvo em {dateBR(f.created_at)}</span></span>
                    <button onClick={() => remove(f.id)} aria-label="Remover" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-red-300"><Trash2 size={16} /></button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </>
  )
}
