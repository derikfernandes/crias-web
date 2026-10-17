import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'crias-monitor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        estado?: string
        avatar?: string
        fundo?: string
        snapshot?: string
        zoom?: string
        velocidade?: string
        giro?: string
      }
    }
  }
}
