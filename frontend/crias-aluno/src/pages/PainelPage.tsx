import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  askMaria,
  fetchStudentPanel,
  isAuthError,
  updateOwnProfile,
  type StudentPanel,
} from '../lib/api'
import { MARIA_AGENT_TRAIL_ID } from '../lib/mariaAgent'
import { toUserFacingError } from '../lib/networkError'
import { clearSession, getSession, setSession } from '../lib/session'
import { ArrowUpIcon, BotMessage, TypingRow, UserBubble } from '../components/ConversationParts'
import { autoGrow } from '../lib/autoGrow'

const NA = 'N/A'
const STATE_LABEL = { done: 'Feita', current: 'Em andamento', released: 'Liberada', blocked: 'Bloqueada' } as const

function pctText(v: number | null): string {
  return v === null ? NA : `${String(v).replace('.', ',')}%`
}

function Bar({ value, tone }: { value: number | null; tone?: 'grad' | 'ok' }) {
  return (
    <span className={tone === 'ok' ? 'v1-1-bar v1-1-bar--ok' : 'v1-1-bar'} aria-hidden="true">
      <span style={{ width: `${value ?? 0}%` }} />
    </span>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="v1-1-card">{children}</div>
}

/** Painel do aluno (1.1.8): só os dados do aluno logado, em formato de conversa com o monitor. */
export default function PainelPage() {
  const navigate = useNavigate()
  const session = getSession()!
  const [panel, setPanel] = useState<StudentPanel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(session.name)
  const [phone, setPhone] = useState(session.phone_number)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [chat, setChat] = useState<Array<{ id: string; role: 'student' | 'monitor'; text: string }>>([])
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    try {
      setPanel(await fetchStudentPanel(session.student_id))
      setError(null)
    } catch (err) {
      if (isAuthError(err)) {
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

  async function saveProfile() {
    setSaveError(null)
    try {
      await updateOwnProfile(session.student_id, { name: name.trim(), phone_number: phone.replace(/\D/g, '') })
      setSession({ ...session, name: name.trim(), phone_number: phone.replace(/\D/g, '') })
      setEditing(false)
      void load()
    } catch (err) {
      setSaveError(toUserFacingError(err, 'Não foi possível salvar as alterações.'))
    }
  }

  async function ask(e?: FormEvent) {
    e?.preventDefault()
    const message = draft.trim()
    if (!message || sending) return
    setDraft('')
    autoGrow(inputRef.current)
    setSending(true)
    setChat((c) => [...c, { id: `u${Date.now()}`, role: 'student', text: message }])
    try {
      const context = panel
        ? `Dados do aluno: acertos ${panel.performance.correct}, erros ${panel.performance.wrong}, trilhas ${panel.trails.map((t) => `${t.name} (${t.done} de ${t.released} atividades)`).join('; ')}.`
        : ''
      const r = await askMaria({
        student_id: session.student_id,
        trail_id: MARIA_AGENT_TRAIL_ID,
        message: context ? `${message}\n\n${context}` : message,
        stage_number: 1,
        question_number: 1,
      })
      setChat((c) => [...c, { id: `m${Date.now()}`, role: 'monitor', text: r.reply }])
    } catch (err) {
      setChat((c) => [...c, { id: `e${Date.now()}`, role: 'monitor', text: toUserFacingError(err, 'Não foi possível falar com o monitor.') }])
    } finally {
      setSending(false)
    }
  }

  const trails = panel ? (filter === 'all' ? panel.trails : panel.trails.filter((t) => t.trail_id === filter)) : []
  const perfTrails = panel ? (filter === 'all' ? panel.performance.by_trail : panel.performance.by_trail.filter((t) => t.trail_id === filter)) : []
  const sel = panel?.trails.find((t) => t.trail_id === filter) ?? null
  const perf = panel
    ? filter === 'all'
      ? panel.performance
      : (() => {
          const t = panel.performance.by_trail.find((x) => x.trail_id === filter)
          const c = t?.correct ?? 0
          const w = t?.wrong ?? 0
          return { ...panel.performance, correct: c, wrong: w, pct: c + w > 0 ? Math.round((c / (c + w)) * 1000) / 10 : null }
        })()
    : null
  const errors = panel ? panel.errors.filter((e) => filter === 'all' || panel.trails.find((t) => t.trail_id === filter)?.name === e.trail) : []
  const doubts = panel ? panel.doubts.filter((d) => filter === 'all' || d.trail_id === filter) : []
  const initial = (name.trim().charAt(0) || 'A').toUpperCase()

  return (
    <section className="v1-0-conv" aria-label="Painel">
      <header className="v1-1-panelhead">
        <span className="v1-1-panelhead__avatar">{initial}</span>
        {editing ? (
          <div className="v1-1-panelhead__edit">
            <input aria-label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <input aria-label="Telefone" value={phone} placeholder={NA} onChange={(e) => setPhone(e.target.value)} />
            <button type="button" className="v1-0-btn" onClick={() => void saveProfile()}>
              Salvar alterações
            </button>
            <button type="button" className="v1-0-btn-soft" onClick={() => { setEditing(false); setName(session.name); setPhone(session.phone_number) }}>
              Cancelar
            </button>
            {saveError ? <span role="alert">{saveError}</span> : null}
          </div>
        ) : (
          <div className="v1-1-panelhead__id">
            <strong data-fade="1">{name || NA}</strong>
            <span>{phone || NA}</span>
          </div>
        )}
        {!editing ? (
          <button type="button" className="v1-0-iconbtn" aria-label="Editar nome e telefone" title="Editar" onClick={() => setEditing(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
              <path d="M13.5 6.5l4 4" />
            </svg>
          </button>
        ) : null}
        <div className="v1-1-pills" role="group" aria-label="Filtrar por trilha">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            Todas as trilhas
          </button>
          {panel?.trails.map((t) => (
            <button key={t.trail_id} type="button" aria-pressed={filter === t.trail_id} onClick={() => setFilter(t.trail_id)}>
              {t.name}
            </button>
          ))}
        </div>
      </header>

      <div className="v1-0-thread" data-thread="1">
        <div className="v1-0-thread__col">
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
              <BotMessage label="Monitor" monitor>
                <p>Progresso</p>
                <Card>
                  {sel ? (
                    <ul className="v1-1-list">
                      {sel.activities.map((a) => (
                        <li key={a.number}>
                          <span>{a.title}</span>
                          <em>{STATE_LABEL[a.state]}</em>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    trails.map((t) => (
                      <div key={t.trail_id} className="v1-1-row">
                        <span>{t.name}</span>
                        <strong>{t.done} de {t.released} atividades</strong>
                        <Bar value={t.pct} />
                      </div>
                    ))
                  )}
                  <div className="v1-1-row">
                    <span>Conclusão</span>
                    <strong>{pctText(sel ? sel.pct : trails.length ? Math.round((trails.reduce((n, t) => n + t.done, 0) / Math.max(1, trails.reduce((n, t) => n + t.released, 0))) * 1000) / 10 : null)}</strong>
                  </div>
                </Card>
              </BotMessage>

              <BotMessage label="Monitor" monitor>
                <p>Desempenho</p>
                <Card>
                  <div className="v1-1-row">
                    <span>Acertos {perf?.correct ?? 0} · Erros {perf?.wrong ?? 0}</span>
                    <strong>{pctText(perf?.pct ?? null)} de acerto</strong>
                  </div>
                  <Bar value={perf?.pct ?? null} tone="ok" />
                  {filter === 'all'
                    ? perfTrails.map((t) => (
                        <div key={t.trail_id} className="v1-1-row">
                          <span>{t.name}</span>
                          <strong>{t.correct} certos, {t.wrong} errados</strong>
                        </div>
                      ))
                    : panel.performance.by_activity
                        .filter((a) => a.trail_id === filter)
                        .map((a) => (
                          <div key={a.number} className="v1-1-row">
                            <span>Atividade {a.number}</span>
                            <strong>{a.correct} certos, {a.wrong} errados</strong>
                          </div>
                        ))}
                </Card>
              </BotMessage>

              <BotMessage label="Monitor" monitor>
                <p>Principais erros</p>
                <Card>
                  {errors.length === 0 ? <span>Nenhum erro por enquanto.</span> : null}
                  {errors.map((e, i) => (
                    <div key={i} className="v1-1-err">
                      <small>{e.trail} · Atividade {e.activity} · Etapa {e.step}</small>
                      <p>{e.statement || NA}</p>
                      <span>Sua resposta: {e.answer || NA} · Resposta certa: {e.correct || NA}</span>
                    </div>
                  ))}
                </Card>
              </BotMessage>

              <BotMessage label="Monitor" monitor>
                <p>Uso do monitor</p>
                <Card>
                  <div className="v1-1-row"><span>Perguntas feitas</span><strong>{panel.monitor.questions}</strong></div>
                  <div className="v1-1-row"><span>Dias com conversa</span><strong>{panel.monitor.days}</strong></div>
                  <div className="v1-1-row">
                    <span>Última conversa</span>
                    <strong>{panel.monitor.last ? new Date(panel.monitor.last).toLocaleDateString('pt-BR') : NA}</strong>
                  </div>
                  {filter === 'all' ? (
                    <>
                      {panel.monitor.by_trail.map((t) => (
                        <div key={t.trail_id} className="v1-1-row"><span>{t.name}</span><strong>{t.questions}</strong></div>
                      ))}
                      <div className="v1-1-row"><span>Monitoria (fora das trilhas)</span><strong>{panel.monitor.outside}</strong></div>
                    </>
                  ) : null}
                </Card>
              </BotMessage>

              <BotMessage label="Monitor" monitor live={chat.length === 0 && !sending}>
                <p>Principais dúvidas</p>
                <Card>
                  {doubts.length === 0 ? <span>Nenhuma dúvida registrada.</span> : null}
                  {doubts.map((d) => (
                    <div key={`${d.trail_id}-${d.activity}`} className="v1-1-err">
                      <small>{d.name}{d.activity ? ` · Atividade ${d.activity}` : ''} · {d.count} {d.count === 1 ? 'pergunta' : 'perguntas'}</small>
                      <p className="v1-1-quote">{d.last_question || NA}</p>
                    </div>
                  ))}
                </Card>
              </BotMessage>

              {chat.map((m, i) =>
                m.role === 'student' ? (
                  <UserBubble key={m.id}>{m.text}</UserBubble>
                ) : (
                  <BotMessage key={m.id} label="Monitor" monitor live={i === chat.length - 1 && !sending}>
                    <p>{m.text}</p>
                  </BotMessage>
                ),
              )}
              {sending ? <TypingRow monitor /> : null}
            </>
          )}
        </div>
      </div>

      <div className="v1-0-dock">
        <form className="v1-0-dock__col" onSubmit={(e) => void ask(e)}>
          <div className="v1-0-dock__row">
            <div className="v1-0-composer">
              <textarea
                ref={inputRef}
                className="v1-0-composer__input"
                rows={1}
                value={draft}
                placeholder="Pergunte ao monitor sobre o seu desempenho…"
                aria-label="Pergunte ao monitor sobre o seu desempenho"
                onChange={(e) => { setDraft(e.target.value); autoGrow(inputRef.current) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask() } }}
              />
              <button type="submit" className="v1-0-sendbtn" aria-label="Enviar pergunta ao monitor" disabled={sending || !draft.trim()}>
                <ArrowUpIcon />
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
