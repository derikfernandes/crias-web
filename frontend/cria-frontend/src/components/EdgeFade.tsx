/**
 * Transição de topo e base (v6, seção 4).
 * Começam na cor sólida do fundo e esmaecem em degradê.
 * Os degradês ficam no CSS (.v6-edge--top e .v6-edge--bottom).
 */
export default function EdgeFade() {
  return (
    <>
      <span className="v6-edge v6-edge--top" aria-hidden="true" />
      <span className="v6-edge v6-edge--bottom" aria-hidden="true" />
    </>
  )
}
