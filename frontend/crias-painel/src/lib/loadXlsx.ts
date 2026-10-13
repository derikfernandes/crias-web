/**
 * Carrega a biblioteca xlsx sob demanda (chunk separado ~424 kB).
 * Compartilhado entre páginas que exportam/importam planilhas.
 */
type XlsxModule = typeof import('xlsx')

let xlsxModulePromise: Promise<XlsxModule> | null = null

export function loadXlsx(): Promise<XlsxModule> {
  xlsxModulePromise ??= import('xlsx')
  return xlsxModulePromise
}
