import { useEffect, useState } from 'react'
import CriasSymbol from '../CriasSymbol'
import { temaAtual } from '../../lib/tema'

/**
 * Personagem do monitor (design v1.1, INTERFACE.md 1.1.2).
 * - `loading`: orbita carregando (só quando o aluno envia mensagem ao monitor).
 * - `live`: última mensagem do monitor: um pulo e depois fica parado, respirando.
 * - `entrada` (v1.2.1, 1.2.1.1): Início do aluno, a 60% da velocidade: carregando, pulo e parado, em ciclo.
 * - sem nenhum dos dois: pose estática, desenhada uma vez e reaproveitada como imagem.
 * O módulo do three.js só é carregado quando o primeiro personagem aparece.
 */
export default function MonitorAvatar({
  size,
  live = false,
  loading = false,
  entrada = false,
}: {
  size: number
  live?: boolean
  loading?: boolean
  entrada?: boolean
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    void import('./criasMonitorElement')
      .then(() => {
        if (alive) setReady(true)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const estado = entrada ? 'entrada' : loading ? 'carregando' : live ? 'pulo' : 'estatico'
  const fundo = temaAtual() === 'escuro' ? 'escuro' : 'claro'
  const still = estado === 'estatico'
  return (
    <span className="v1-1-mon" style={{ width: size, height: size, ...(entrada ? { margin: '-12px 0' } : {}) }} aria-hidden="true">
      {ready ? (
        <crias-monitor
          key={estado}
          estado={estado}
          avatar=""
          fundo={fundo}
          {...(entrada ? { velocidade: '0.6' } : {})}
          {...(still ? { snapshot: '' } : {})}
          style={{ position: 'absolute', inset: 0, display: 'block', width: size, height: size }}
        />
      ) : (
        <CriasSymbol size={size} />
      )}
    </span>
  )
}
