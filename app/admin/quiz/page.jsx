import { redirect } from 'next/navigation'
import AdminQuizClient from './AdminQuizClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListAdminQuizQuestions } from '@/lib/server/quiz/quiz.service.js'

export const dynamic = 'force-dynamic'

export default async function AdminQuizPage() {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/quiz')
  }
  if (currentUser.role !== 'admin') {
    redirect('/calendar')
  }

  const { questions } = await serviceListAdminQuizQuestions()
  return <AdminQuizClient initialQuestions={questions} />
}
