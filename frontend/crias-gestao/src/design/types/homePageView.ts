export type HomePageUsageStats = {
  /** Alunos com trilha em andamento */
  inProgress: number
  /** Alunos que concluíram ao menos uma trilha */
  completed: number
  /** Vínculos ainda não iniciados */
  notStarted: number
  /** Alunos com interação nos últimos 7 dias */
  activeLast7Days: number
}

export type HomePageInstitutionCard = {
  id: string
  name: string
  type: string
  active: boolean
  detailHref: string
  dashboardHref: string
  gerenciamentoHref: string
  activeStudents: number
  activeTrails: number
  usage: HomePageUsageStats
}

export type HomePageTotals = {
  institutions: number
  activeStudents: number
  activeTrails: number
  usage: HomePageUsageStats
}

export type HomePageViewProps = {
  canCreate: boolean
  loading: boolean
  error: string | null
  /** Uma instituição: mostra detalhe; várias: grid de cards */
  mode: 'empty' | 'single' | 'multi'
  totals: HomePageTotals
  cards: HomePageInstitutionCard[]
  /** Garante que Dashboard / Gestão abram na instituição certa */
  onRememberInstitution: (institutionId: string) => void
}
