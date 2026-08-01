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
export default async function JobsPage({ searchParams }) {
  const user = await getCurrentUserFromRequest()
  const params = await searchParams

  if (!user) {
    redirect('/login?redirectTo=/jobs')
  }

  const [{ jobListings, search, sourceMeta, pagination }, { applications }, cvProfiles] = await Promise.all([
    serviceListJobListings({
      what: params?.what,
      where: params?.where,
      page: params?.page,
    }),
    serviceListJobApplications(),
    serviceListProfiles(),
  ])

  return (
    <JobsClient
      initialJobListings={jobListings}
      initialApplications={applications}
      initialCVProfiles={cvProfiles}
      initialSearch={search}
      sourceMeta={sourceMeta}
      pagination={pagination}
    />
  )
}
