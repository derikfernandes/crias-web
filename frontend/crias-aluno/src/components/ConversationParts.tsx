import type { ReactNode, RefObject } from 'react'
import CriasSymbol from './CriasSymbol'

/**
 * Peças da conversa (v6, seção 10), usadas pela trilha e pela Monitoria.
 */

/** Balão do aluno: à direita, sem avatar nem horário. */
export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="v6-msg v6-msg--user">
      <div className="v6-bubble" aria-label="Você">
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
}: BotProps) {
  return (
    <div className="v6-msg v6-msg--bot">
      <span className="v6-msg__sym">
        <CriasSymbol size={30} animated={animatedSymbol} />
      </span>
      <div className="v6-msg__body">
        <span className="v6-msg__labelrow">
          <span className="v6-msg__symsm">
            <CriasSymbol size={20} animated={animatedSymbol} />
          </span>
          <span className="v6-msg__label" data-fade="1" id={labelId}>
            {label}
          </span>
          {feedback ? (
            <span className={`v6-badge v6-badge--${feedback}`}>
              {feedback === 'ok' ? 'Acertou' : 'Quase'}
            </span>
          ) : null}
        </span>
        <div className="v6-msg__text">{children}</div>
      </div>
    </div>
  )
}

/** Carregando resposta ou etapa nova: símbolo em movimento e três pontos. */
export function TypingRow() {
  return (
    <div className="v6-typing" role="status" aria-live="polite" aria-label="Aguarde">
      <span className="v6-typing__sym">
        <CriasSymbol size={30} />
      </span>
      <span className="v6-typing__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
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
        className="v6-arrow v6-arrow--up"
        aria-label="Ir para o topo"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      </button>
      <button
        ref={downRef}
        type="button"
        className="v6-arrow v6-arrow--down"
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
