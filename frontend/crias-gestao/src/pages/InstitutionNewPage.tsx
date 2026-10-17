import { InstitutionForm } from '../components/InstitutionForm'
import { InstitutionNewPageView } from '../design/views/InstitutionNewPageView'

export function InstitutionNewPage() {
  return <InstitutionNewPageView formSlot={<InstitutionForm />} />
}
