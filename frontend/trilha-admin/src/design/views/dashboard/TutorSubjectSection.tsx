import { Link } from 'react-router-dom'
import type { DashboardAgentStudentLink } from '../../types/dashboardPageView'

export type TutorSubjectSectionProps = {
  subjectLabel: string
  periodLabel: string
  messages: number
  students: number
  coveragePct: number | null
  messagesPerDay: number
  perStudentPerDay: number
  perStudentPeriod: number
  topStudents: DashboardAgentStudentLink[]
}

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR')
}

function formatOneDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('pt-BR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })
}

export function TutorSubjectSection({
  subjectLabel,
  periodLabel,
  messages,
  students,
  coveragePct,
  messagesPerDay,
  perStudentPerDay,
  perStudentPeriod,
  topStudents,
}: TutorSubjectSectionProps) {
  if (messages <= 0 && students <= 0) return null

  const cov = coveragePct ?? 0

  return (
    <section
      className="crias-tutor-subj"
      aria-label={`Conversas com o tutor de ${subjectLabel}`}
    >
      <div className="crias-tutor-subj__head">
        <div className="crias-label">Tutor de {subjectLabel}</div>
        <h2
          className="crias-section-title"
          style={{ borderBottom: 0, paddingBottom: 0 }}
        >
          Conversas com o tutor
        </h2>
      </div>

      <div className="crias-tutor-subj__grid">
        <div className="crias-tutor-subj__col">
          <div className="crias-label">Consolidado</div>
          <div className="crias-tutor-subj__consol">
            <div className="crias-tutor-subj__metric">
              <span className="crias-tutor-subj__metric-label">Mensagens</span>
              <strong>{formatInt(messages)}</strong>
            </div>
            <div className="crias-tutor-subj__metric">
              <span className="crias-tutor-subj__metric-label">
                Alunos que conversaram
              </span>
              <strong>{formatInt(students)}</strong>
            </div>
            <div className="crias-tutor-subj__metric crias-tutor-subj__metric--bar">
              <span className="crias-tutor-subj__metric-label">Da turma</span>
              <strong>{Math.round(cov)}%</strong>
              <span className="crias-tutor-subj__bar" aria-hidden="true">
                <span style={{ width: `${Math.max(0, Math.min(100, cov))}%` }} />
              </span>
            </div>
            <div className="crias-tutor-subj__metric">
              <span className="crias-tutor-subj__metric-label">
                Mensagens por dia
              </span>
              <strong>{formatInt(messagesPerDay)}</strong>
            </div>
            <div className="crias-tutor-subj__metric">
              <span className="crias-tutor-subj__metric-label">
                Por aluno, por dia
              </span>
              <strong>{formatOneDecimal(perStudentPerDay)}</strong>
            </div>
            <div className="crias-tutor-subj__metric">
              <span className="crias-tutor-subj__metric-label">
                Por aluno no período
              </span>
              <strong>{formatInt(perStudentPeriod)}</strong>
            </div>
          </div>
        </div>

        <div className="crias-tutor-subj__col">
          <div className="crias-label">Quem mais conversa</div>
          {topStudents.length === 0 ? (
            <p className="muted">Nenhum aluno listado neste tutor.</p>
          ) : (
            <ul className="crias-tutor-subj__list">
              {topStudents.slice(0, 5).map((stu) => (
                <li key={stu.id}>
                  <Link to={stu.href} className="crias-tutor-subj__row">
                    <span>
                      <strong>{stu.name}</strong>
                      <span className="muted">{stu.lastActivityLabel}</span>
                    </span>
                    <span className="crias-tutor-subj__msgs">
                      {stu.messages} msgs
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="crias-tutor-subj__foot">
        {periodLabel} · os temas mais perguntados estão em Aprendizagem
      </p>
    </section>
  )
}
