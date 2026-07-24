import { serviceGetQuizStreak } from '@/lib/server/progress/quiz-streak.service.js'
import StreakBadge from './StreakBadge.jsx'

export const dynamic = 'force-dynamic'

export default async function StreakBadgeServer() {
  const streak = await serviceGetQuizStreak()
  return <StreakBadge initialStreak={streak} />
}
