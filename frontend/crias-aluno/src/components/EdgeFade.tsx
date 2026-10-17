/**
 * Transição de topo e base (v1.0, seção 4).
 * Começam na cor sólida do fundo e esmaecem em degradê.
 * Os degradês ficam no CSS (.v1-0-edge--top e .v1-0-edge--bottom).
 */
export default function EdgeFade() {
  return (
    <>
      <span className="v1-0-edge v1-0-edge--top" aria-hidden="true" />
      <span className="v1-0-edge v1-0-edge--bottom" aria-hidden="true" />
    </>
  )
}
