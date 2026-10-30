import { useEffect, useMemo, useState } from 'react'
import { fetchInstitutionMetrics, type MetricsStudentView } from '../lib/dashboardMetricsApi'

/**
 * Desempenho de cada aluno, da mesma fonte do Dados (métricas por instituição no servidor): atividades
 * liberadas e feitas, % de conclusão, acertos, erros e % de acerto (1.3.11). Sem dado: as colunas mostram N/A.
 */
export function useStudentMetrics(institutionIds: string[]): {
  byStudent: Map<string, MetricsStudentView>
  loading: boolean
} {
  const key = [...institutionIds].sort().join(',')
  const [state, setState] = useState<{ key: string; map: Map<string, MetricsStudentView> }>({ key: '', map: new Map() })
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!key) return
    let alive = true
    setLoading(true)
    void Promise.allSettled(key.split(',').map((id) => fetchInstitutionMetrics(id)))
      .then((res) => {
        if (!alive) return
        const map = new Map<string, MetricsStudentView>()
        for (const r of res) if (r.status === 'fulfilled') for (const s of r.value.students ?? []) map.set(s.id, s)
        setState({ key, map })
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [key])
  return useMemo(() => ({ byStudent: state.key === key ? state.map : new Map(), loading }), [state, key, loading])
}

export function pctOf(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : null
}
