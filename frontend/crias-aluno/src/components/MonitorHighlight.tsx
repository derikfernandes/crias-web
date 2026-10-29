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
}: {
  parts: OfferPart[]
  disabled?: boolean
  onAsk: (question: string) => void
  onGo: () => void
}) {
  return (
    <div className="v125-mon" role="group" aria-label="O monitor sugere">
      <MonitorAvatar size={52} live />
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
  )
}
