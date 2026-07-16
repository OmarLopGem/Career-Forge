import { redirect } from 'next/navigation'
import QuizClient from './QuizClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'

export const dynamic = 'force-dynamic'

export default async function QuizPage() {
  if (!(await getCurrentUserFromRequest())) {
    redirect('/login?redirectTo=/quiz')
  }

  return <QuizClient />
}
