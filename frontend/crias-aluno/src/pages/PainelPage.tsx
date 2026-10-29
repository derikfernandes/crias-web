import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStudentPanel, isAuthError, type StudentPanel } from '../lib/api'
import { MARIA_AGENT_TRAIL_ID } from '../lib/mariaAgent'
import { toUserFacingError } from '../lib/networkError'
import { clearSession, getSession } from '../lib/session'
import { ArrowUpIcon } from '../components/ConversationParts'
import { autoGrow } from '../lib/autoGrow'

const NA = 'N/A'

function pctText(v: number | null): string {
  return v === null ? NA : `${String(Math.round(v)).replace('.', ',')}%`
}

function Bar({ value, tone }: { value: number | null; tone?: 'grad' | 'ok' }) {
  return (
    <span className={tone === 'ok' ? 'v1-1-bar v1-1-bar--ok' : 'v1-1-bar'} aria-hidden="true">
      <span style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </span>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="v1-2-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

type ActivityRow = {
  key: string
  trailId: string
  trailName: string
  number: number
  title: string
  correct: number
  wrong: number
  pct: number
}

/** Painel do aluno (1.1.1.b, Revisão 6 e 7): dashboard com filtro por trilha, só os dados do aluno logado. */
export default function PainelPage() {
  const navigate = useNavigate()
  const session = getSession()!
  const [panel, setPanel] = useState<StudentPanel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    try {
      setPanel(await fetchStudentPanel(session.student_id))
      setError(null)
    } catch (err) {
      // O player não envia Bearer; 401/403 do painel não devem deslogar.
      // Só limpa sessão se a sessão local já sumiu.
      if (isAuthError(err) && !getSession()) {
        clearSession('auth')
        navigate('/login', { replace: true, state: { reason: 'auth' } })
        return
      }
      setError(toUserFacingError(err, 'Não foi possível carregar o seu painel.'))
    }
  }, [navigate, session.student_id])

  useEffect(() => {
    void load()
  }, [load])

  /** Enviar leva à Monitoria: a pergunta entra lá como mensagem do aluno e o monitor responde. */
  function ask(e?: FormEvent) {
    e?.preventDefault()
    const message = draft.trim()
    if (!message) return
    try {
      sessionStorage.setItem(`crias:maria-draft:${MARIA_AGENT_TRAIL_ID}`, message)
    } catch {
      /* sem armazenamento: a pergunta fica no campo da Monitoria */
    }
    navigate('/monitoria')
  }

  const trails = useMemo(
    () => (panel ? (filter === 'all' ? panel.trails : panel.trails.filter((t) => t.trail_id === filter)) : []),
    [panel, filter],
  )
  const released = trails.reduce((n, t) => n + t.released, 0)
  const done = trails.reduce((n, t) => n + t.done, 0)
  const concl = released > 0 ? (done / released) * 100 : null

  const perf = useMemo(() => {
    if (!panel) return { correct: 0, wrong: 0, pct: null as number | null }
    const list = panel.performance.by_trail.filter((t) => filter === 'all' || t.trail_id === filter)
    const c = list.reduce((n, t) => n + t.correct, 0)
    const w = list.reduce((n, t) => n + t.wrong, 0)
    return { correct: c, wrong: w, pct: c + w > 0 ? (c / (c + w)) * 100 : null }
  }, [panel, filter])

  const activities = useMemo<ActivityRow[]>(() => {
    if (!panel) return []
    const names = new Map(panel.trails.map((t) => [t.trail_id, t.name]))
    const titles = new Map(panel.trails.flatMap((t) => t.activities.map((a) => [`${t.trail_id}|${a.number}`, a.title] as const)))
    return panel.performance.by_activity
      .filter((a) => filter === 'all' || a.trail_id === filter)
      .map((a) => ({
        key: `${a.trail_id}|${a.number}`,
        trailId: a.trail_id,
        trailName: names.get(a.trail_id) ?? a.trail_id,
        number: a.number,
        title: titles.get(`${a.trail_id}|${a.number}`) ?? `Atividade ${a.number}`,
        correct: a.correct,
        wrong: a.wrong,
        pct: a.correct + a.wrong > 0 ? (a.correct / (a.correct + a.wrong)) * 100 : 0,
      }))
  }, [panel, filter])

  const moreWrong = [...activities].filter((a) => a.wrong > 0).sort((a, b) => a.pct - b.pct || b.wrong - a.wrong).slice(0, 3)
  const moreRight = [...activities].filter((a) => a.correct > 0).sort((a, b) => b.pct - a.pct || b.correct - a.correct).slice(0, 3)

  function toggle(key: string) {
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  function ActivityList({ title, list, tone }: { title: string; list: ActivityRow[]; tone: 'err' | 'ok' }) {
    return (
      <div className="v1-2-rank">
        <h4>{title}</h4>
        {list.length === 0 ? <p className="v1-2-muted">{NA}</p> : null}
        {list.map((a) => {
          const k = `${tone}|${a.key}`
          const isOpen = open.has(k)
          const wrongs = panel?.errors.filter((e) => e.trail_id === a.trailId && e.activity === a.number) ?? []
          return (
            <div key={k} className="v1-2-rank__item">
              <div className="v1-2-rank__row">
                <span data-fade="1" title={`${a.trailName} · Atividade ${a.number} · ${a.title}`}>
                  {a.trailName} · Atividade {a.number} · {a.title}
                </span>
                <button type="button" className="v1-2-chev" aria-expanded={isOpen} aria-label={isOpen ? 'Fechar detalhes' : 'Abrir detalhes'} onClick={() => toggle(k)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={isOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
                  </svg>
                </button>
                <span className={tone === 'err' ? 'v1-2-tag v1-2-tag--err' : 'v1-2-tag v1-2-tag--ok'}>{pctText(tone === 'err' ? 100 - a.pct : a.pct)}</span>
              </div>
              {isOpen ? (
                <div className="v1-2-rank__more">
                  <p>
                    Acertos: <strong>{a.correct}</strong> · Erros: <strong>{a.wrong}</strong>
                  </p>
                  {wrongs.length === 0 ? <p className="v1-2-muted">Nenhum exercício errado nesta atividade.</p> : null}
                  {wrongs.map((e, i) => (
                    <div key={i} className="v1-1-err">
                      <small>Etapa {e.step}</small>
                      <p>{e.statement || NA}</p>
                      <span>
                        Sua resposta: {e.answer || NA} · Resposta certa: {e.correct || NA}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section className="v1-0-conv" aria-label="Painel">
      <div className="v1-2-pills" role="group" aria-label="Filtrar por trilha">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Todas as trilhas
        </button>
        {panel?.trails.map((t) => (
          <button key={t.trail_id} type="button" aria-pressed={filter === t.trail_id} onClick={() => setFilter(t.trail_id)}>
            {t.name}
          </button>
        ))}
      </div>

      <div className="v1-0-thread v1-2-scroll" data-thread="1">
        <div className="v1-2-cards">
          {error ? (
            <div className="v1-0-errbox" role="alert">
              <p>{error}</p>
              <button type="button" className="v1-0-btn-soft" onClick={() => void load()}>
                Tentar de novo
              </button>
            </div>
          ) : !panel ? (
            <div className="v1-0-skel" role="status" aria-busy="true">
              <div style={{ width: '30%' }} />
              <div style={{ width: '70%' }} />
            </div>
          ) : (
            <>
              <article className="v1-2-card" aria-label="Progresso">
                <h3>Progresso</h3>
                <div className="v1-2-stats">
                  <StatBox label="Atividades liberadas" value={released} />
                  <StatBox label="Atividades feitas" value={done} />
                  <StatBox label="% de conclusão" value={pctText(concl)} />
                </div>
                <Bar value={concl} />
                {trails.map((t) => (
                  <div key={t.trail_id} className="v1-2-trailrow">
                    <div>
                      <strong data-fade="1">{t.name}</strong>
                      <span>
                        {t.done} de {t.released} atividades
                      </span>
                    </div>
                    <Bar value={t.pct} />
                  </div>
                ))}
              </article>

              <article className="v1-2-card" aria-label="Desempenho">
                <h3>Desempenho</h3>
                <p className="v1-2-muted">
                  {perf.correct + perf.wrong > 0
                    ? `Nos exercícios, você acertou ${perf.correct} de ${perf.correct + perf.wrong} respostas.`
                    : 'Você ainda não respondeu exercícios.'}
                </p>
                <div className="v1-2-stats">
                  <StatBox label="Acertos" value={perf.correct} />
                  <StatBox label="Erros" value={perf.wrong} />
                  <StatBox label="% de acerto" value={pctText(perf.pct)} />
                </div>
                <Bar value={perf.pct} tone="ok" />
                <p className="v1-2-legend">
                  <span className="v1-2-dot v1-2-dot--ok" /> Acertos <span className="v1-2-dot v1-2-dot--err" /> Erros
                </p>
                <div className="v1-2-ranks">
                  <ActivityList title="Mais erros" list={moreWrong} tone="err" />
                  <ActivityList title="Mais acertos" list={moreRight} tone="ok" />
                </div>
              </article>

              <article className="v1-2-card" aria-label="Uso do monitor">
                <h3>Uso do monitor</h3>
                <div className="v1-2-stats">
                  <StatBox label="Perguntas feitas" value={panel.monitor.questions} />
                  <StatBox label="Dias com conversa" value={panel.monitor.days} />
                  <StatBox label="Última conversa" value={panel.monitor.last ? new Date(panel.monitor.last).toLocaleDateString('pt-BR') : NA} />
                </div>
                {filter === 'all' ? (
                  <>
                    {panel.monitor.by_trail.map((t) => (
                      <div key={t.trail_id} className="v1-1-row">
                        <span>{t.name}</span>
                        <strong>{t.questions}</strong>
                      </div>
                    ))}
                    <div className="v1-1-row">
                      <span>Monitoria (fora das trilhas)</span>
                      <strong>{panel.monitor.outside}</strong>
                    </div>
                  </>
                ) : (
                  <div className="v1-1-row">
                    <span>{panel.trails.find((t) => t.trail_id === filter)?.name}</span>
                    <strong>{panel.monitor.by_trail.find((t) => t.trail_id === filter)?.questions ?? 0}</strong>
                  </div>
                )}
              </article>
            </>
          )}
        </div>
      </div>

      <div className="v1-0-dock">
        <form className="v1-0-dock__col" onSubmit={ask}>
          <div className="v1-0-dock__row">
            <div className="v1-0-composer">
              <textarea
                ref={inputRef}
                className="v1-0-composer__input"
                rows={1}
                value={draft}
                placeholder="Pergunte ao monitor sobre o seu desempenho…"
                aria-label="Pergunte ao monitor sobre o seu desempenho"
                onChange={(e) => {
                  setDraft(e.target.value)
                  autoGrow(inputRef.current)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask()
                  }
                }}
              />
              <button type="submit" className="v1-0-sendbtn" aria-label="Enviar pergunta ao monitor" disabled={!draft.trim()}>
                <ArrowUpIcon />
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
