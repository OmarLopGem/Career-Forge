import { redirect } from 'next/navigation'
import CalendarClient from './CalendarClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import {
  serviceListCalendarEvents,
  serviceListJobApplications,
  serviceListJobListings,
} from '@/lib/job-tracker/server/job-tracker.service.js'
import { serviceListProfiles } from '@/lib/cv-assistant/server/cv-service.js'

export const dynamic = 'force-dynamic'

// Load every calendar dependency on the server first so the client can start
// with a complete tracker state instead of stitching together multiple fetches.
export default async function CalendarPage() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect('/login?redirectTo=/calendar')
  }

  const [{ applications }, { events }, { jobListings }, cvProfiles] = await Promise.all([
    serviceListJobApplications(),
    serviceListCalendarEvents(),
    serviceListJobListings(),
    serviceListProfiles(),
  ])

  return (
    <CalendarClient
      initialApplications={applications}
      initialEvents={events}
      initialJobListings={jobListings}
      initialCVProfiles={cvProfiles}
    />
  )
}
