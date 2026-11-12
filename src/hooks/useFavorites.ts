import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type FavKind = 'institution' | 'contest' | 'news' | 'subject' | 'question'

export function useFavorites() {
  const [favs, setFavs] = useState<any[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('favorites').select('*').order('created_at', { ascending: false })
    setFavs(data ?? [])
  }, [])
  useEffect(() => { load() }, [load])

  const has = (kind: FavKind, id: string) => favs.some((f) => f.kind === kind && f.ref_id === id)

  const toggle = async (kind: FavKind, id: string, label: string) => {
    const existing = favs.find((f) => f.kind === kind && f.ref_id === id)
    if (existing) await supabase.from('favorites').delete().eq('id', existing.id)
    else await supabase.from('favorites').insert({ kind, ref_id: id, label })
    await load()
  }

  return { favs, has, toggle, reload: load }
}
