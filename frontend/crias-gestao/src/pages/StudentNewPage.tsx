import { StudentForm } from '../components/StudentForm'
import { StudentNewPageView } from '../design/views/StudentNewPageView'

export function StudentNewPage() {
  return <StudentNewPageView formSlot={<StudentForm />} />
}
