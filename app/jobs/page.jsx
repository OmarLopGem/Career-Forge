import { redirect } from 'next/navigation'
import JobsClient from './JobsClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import {
  serviceListJobApplications,
  serviceListJobListings,
} from '@/lib/job-tracker/server/job-tracker.service.js'
import { serviceListProfiles } from '@/lib/cv-assistant/server/cv-service.js'

export const dynamic = 'force-dynamic'

// Jobs needs both the shared catalog and the user's tracked applications so the
// UI can show which listings are already being followed.
export default async function JobsPage() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect('/login?redirectTo=/jobs')
  }

  const [{ jobListings }, { applications }, cvProfiles] = await Promise.all([
    serviceListJobListings(),
    serviceListJobApplications(),
    serviceListProfiles(),
  ])

  return (
    <JobsClient
      initialJobListings={jobListings}
      initialApplications={applications}
      initialCVProfiles={cvProfiles}
    />
  )
}
