import MonitorAvatar from './monitor/MonitorAvatar'
import type { OfferPart } from '../lib/monitorOffers'

/**
 * Mensagem do monitor em destaque (1.2.5.3 e 1.2.5.7): fundo azul muito claro, sem o rótulo "Monitor", o
 * personagem à esquerda (52px) e trechos grifados tocáveis. Só a última oferta fica ativa.
 */
export default function MonitorHighlight({
  parts,
  disabled,
  onAsk,
  onGo,
  delayMs = 0,
}: {
  parts: OfferPart[]
  /** Respiro antes de entrar (1.2.5.11: 0,9s depois da mensagem pronta). */
  delayMs?: number
  disabled?: boolean
  onAsk: (question: string) => void
  onGo: () => void
}) {
  return (
    <div className="v125-mon" role="group" aria-label="O monitor sugere" style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}>
      <MonitorAvatar size={52} live />
      <div className="v125-mon__body">
      <p>
        {parts.map((p, i) =>
          p.ask || p.go ? (
            <button
              key={i}
              type="button"
              className="v125-mark"
              disabled={disabled}
              onClick={() => (p.go ? onGo() : onAsk(p.ask as string))}
            >
              {p.text}
            </button>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </p>
      </div>
    </div>
  )
}
