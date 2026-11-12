export const brl = (v: number | null | undefined) =>
  v == null ? 'Dados não confirmados' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const dateBR = (d: string | null | undefined) =>
  d ? new Date(d.length <= 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—'

export const STATUS_LABEL: Record<string, string> = {
  confirmado: 'Confirmado',
  em_verificacao: 'Em verificação',
  desatualizado: 'Desatualizado',
  nao_confirmado: 'Dados não confirmados',
}

export const STATUS_CLASS: Record<string, string> = {
  confirmado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  em_verificacao: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  desatualizado: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  nao_confirmado: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

export const CONTEST_STATUS: Record<string, string> = {
  autorizado: 'Autorizado',
  previsto: 'Previsto',
  edital_publicado: 'Edital publicado',
  inscricoes_abertas: 'Inscrições abertas',
  em_andamento: 'Em andamento',
  encerrado: 'Encerrado',
}

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export const SPHERE_LABEL: Record<string, string> = { federal: 'Federal', estadual: 'Estadual', distrital: 'Distrital', municipal: 'Municipal' }

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Prioridade pedida: 1 PRF, 2 PF, 3 PM-GO, 4 PC-GO, 5 PP-GO, 6 Científica-GO, 7 demais
export function newsPriority(text: string): number {
  const t = normalize(text)
  const go = /\bgo\b|goias|goiania/.test(t)
  if (/\bprf\b|rodoviaria federal/.test(t)) return 1
  if (/policia federal|\bpf\b/.test(t) && !/militar|civil/.test(t)) return 2
  if (go && /militar|\bpm\b/.test(t)) return 3
  if (go && /civil|\bpc\b/.test(t)) return 4
  if (go && /penal/.test(t)) return 5
  if (go && /cientifica|tecnico-cientifica/.test(t)) return 6
  return 7
}
