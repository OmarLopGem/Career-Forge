import { redirect } from 'next/navigation'
import CVAssistantClient from './CVAssistantClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'

export const metadata = {
  title: 'CV Assistant · Career Forge',
  description:
    'Upload your CV, review the parsed profile, get AI feedback, and download a polished resume in one of five templates.',
}

export const dynamic = 'force-dynamic'

export default async function CVAssistantPage() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect('/login?redirectTo=/cv-assistant')
  }

  return <CVAssistantClient />
}
