import { redirect } from 'next/navigation'
import CalendarClient from './CalendarClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import {
  serviceListCalendarEvents,
  serviceListJobApplications,
  serviceListJobListings,
} from '@/lib/job-tracker/server/job-tracker.service.js'

export const dynamic = 'force-dynamic'

// Load every calendar dependency on the server first so the client can start
// with a complete tracker state instead of stitching together multiple fetches.
export default async function CalendarPage() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect('/login?redirectTo=/calendar')
  }

  const [{ applications }, { events }, { jobListings }] = await Promise.all([
    serviceListJobApplications(),
    serviceListCalendarEvents(),
    serviceListJobListings(),
  ])

  return (
    <CalendarClient
      initialApplications={applications}
      initialEvents={events}
      initialJobListings={jobListings}
    />
  )
}
