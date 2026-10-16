import { useContext } from 'react'
import {
  GestaoContext,
  type GestaoContextValue,
} from '../contexts/gestao-context'

export function useGestao(): GestaoContextValue {
  const ctx = useContext(GestaoContext)
  if (!ctx) {
    throw new Error('useGestao deve ser usado dentro de GestaoProvider.')
  }
  return ctx
}
