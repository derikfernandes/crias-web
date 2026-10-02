export type StatusTagTone =
  | 'concluiu'
  | 'final'
  | 'meio'
  | 'inicio'
  | 'parado'
  | 'nao-iniciou'
  | 'ativa'
  | 'inativa'

export type StatusTagProps = {
  label: string
  tone: StatusTagTone
}

export function StatusTag({ label, tone }: StatusTagProps) {
  return <span className={`crias-tag crias-tag--${tone}`}>{label}</span>
}
