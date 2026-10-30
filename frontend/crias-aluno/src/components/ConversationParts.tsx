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
  if (monitor) {
    // 1.2.5.3 e 1.2.5.10: toda mensagem do monitor fica na caixa do monitor (fundo azul muito claro, personagem
    // de 52px à esquerda, sem o rótulo "Monitor"), na largura da barra de mensagem. O rótulo fica só para leitores
    // de tela. Na trilha e na Monitoria.
    return (
      <div className="v125-mon" role="group" aria-labelledby={labelId}>
        <MonitorAvatar size={52} live={live} />
        <div className="v125-mon__body">
          <span className="v125-sr" id={labelId}>
            {label}
          </span>
          <div className="v1-0-msg__text">{children}</div>
        </div>
      </div>
    )
  }
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
          {monitor ? (
            <span className="v1-0-msg__label" data-fade="1" id={labelId}>
              {label}
            </span>
          ) : (
            // Bloco de conteúdo sem título (1.2.5.9): só o símbolo do Crias e o texto.
            <span className="v1-0-msg__label v125-sr" data-fade="1" id={labelId}>
              {label}
            </span>
          )}
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
 * Espera no lugar final da mensagem (1.2.5.8 a 1.2.5.11), igual ao protótipo. Dura exatamente o tempo da API:
 * a mensagem entra no retorno, no mesmo lugar, com o mesmo esmaecimento (sem espera artificial).
 * - Conteúdo da trilha: símbolo do Crias pulsando e três pontos ao lado.
 * - Monitor: a caixa do monitor com o personagem carregando e duas linhas de espera.
 */
export function TypingRow({ monitor = false }: { monitor?: boolean }) {
  if (!monitor) {
    return (
      <div className="v125-wait" role="status" aria-live="polite" aria-label="Carregando etapa" data-typing="1">
        <span className="v125-wait__sym">
          <CriasSymbol size={38} />
        </span>
        <div className="v125-wait__row">
          <span className="v125-wait__symsm">
            <CriasSymbol size={33} />
          </span>
          <span className="v125-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    )
  }
  return (
    <div className="v125-mon" role="status" aria-live="polite" aria-label="Monitor escrevendo" data-typing="1">
      <MonitorAvatar size={52} loading />
      <div className="v125-mon__body v125-mon__wait" aria-hidden="true">
        <span />
        <span />
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
