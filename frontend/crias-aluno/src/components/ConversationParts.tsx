import type { ReactNode, RefObject } from 'react'
import CriasSymbol from './CriasSymbol'
import MonitorAvatar from './monitor/MonitorAvatar'

/**
 * Peças da conversa (v1.0, seção 10), usadas pela trilha e pela Monitoria.
 */

/** Balão do aluno: à direita, sem avatar nem horário. */
export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="v1-0-msg v1-0-msg--user">
      <div className="v1-0-bubble" aria-label="Você">
        {children}
      </div>
    </div>
  )
}

type BotProps = {
  /** Nome da trilha, "Monitor" ou "Atividade concluída". */
  label: string
  children: ReactNode
  /** Selo de retorno do exercício. */
  feedback?: 'ok' | 'no' | null
  /** Símbolo em movimento (só na mensagem "Atividade concluída" enquanto for a última). */
  animatedSymbol?: boolean
  labelId?: string
  /** Mensagem do monitor: mostra o personagem em vez do símbolo do Crias. */
  monitor?: boolean
  /** Última mensagem do monitor: o personagem pula uma vez e fica parado. */
  live?: boolean
}

/**
 * Mensagem da trilha ou do monitor: sem balão.
 * Computador: símbolo de 30px à esquerda. Celular: símbolo de 20px antes do rótulo.
 */
export function BotMessage({
  label,
  children,
  feedback,
  animatedSymbol = false,
  labelId,
  monitor = false,
  live = false,
}: BotProps) {
  return (
    <div className="v1-0-msg v1-0-msg--bot">
      <span className="v1-0-msg__sym">
        {monitor ? (
          <MonitorAvatar size={38} live={live} />
        ) : (
          <CriasSymbol size={38} animated={animatedSymbol} />
        )}
      </span>
      <div className="v1-0-msg__body">
        <span className="v1-0-msg__labelrow">
          <span className="v1-0-msg__symsm">
            {monitor ? (
              <MonitorAvatar size={33} live={live} />
            ) : (
              <CriasSymbol size={33} animated={animatedSymbol} />
            )}
          </span>
          <span className="v1-0-msg__label" data-fade="1" id={labelId}>
            {label}
          </span>
          {feedback ? (
            <span className={`v1-0-badge v1-0-badge--${feedback}`}>
              {feedback === 'ok' ? 'Acertou' : 'Quase'}
            </span>
          ) : null}
        </span>
        <div className="v1-0-msg__text">{children}</div>
      </div>
    </div>
  )
}

/**
 * Carregando (1.1.2 e orientação 18).
 * - Continuar (trilha): só os três pontos, sem personagem.
 * - Mensagem ao monitor: o personagem carregando, "Monitor" ao lado e os três pontos logo abaixo.
 */
export function TypingRow({ monitor = false }: { monitor?: boolean }) {
  if (!monitor) {
    return (
      <div className="v1-0-typing" role="status" aria-live="polite" aria-label="Aguarde">
        <span className="v1-0-typing__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    )
  }
  return (
    <div className="v1-0-msg v1-0-msg--bot" role="status" aria-live="polite" aria-label="O monitor está digitando">
      <span className="v1-0-msg__sym">
        <MonitorAvatar size={38} loading />
      </span>
      <div className="v1-0-msg__body">
        <span className="v1-0-msg__labelrow">
          <span className="v1-0-msg__symsm">
            <MonitorAvatar size={33} loading />
          </span>
          <span className="v1-0-msg__label">Monitor</span>
        </span>
        <span className="v1-1-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  )
}

/** Setas redondas de topo e fim da conversa (controladas por useThreadScroll). */
export function ScrollArrows({
  upRef,
  downRef,
}: {
  upRef: RefObject<HTMLButtonElement | null>
  downRef: RefObject<HTMLButtonElement | null>
}) {
  return (
    <>
      <button
        ref={upRef}
        type="button"
        className="v1-0-arrow v1-0-arrow--up"
        aria-label="Ir para o topo"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      </button>
      <button
        ref={downRef}
        type="button"
        className="v1-0-arrow v1-0-arrow--down"
        aria-label="Ir para o fim"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </button>
    </>
  )
}

export function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  )
}
