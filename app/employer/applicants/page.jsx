import { redirect } from 'next/navigation'
import EmployerApplicantsClient from './EmployerApplicantsClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListEmployerApplicants } from '@/lib/job-tracker/server/employer-applicant.service.js'
import { serviceListMyEmployerJobListings } from '@/lib/job-tracker/server/employer-listing.service.js'

export const dynamic = 'force-dynamic'

export default async function EmployerApplicantsPage({ searchParams }) {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect('/login?redirectTo=/employer/applicants')
  }

  if (user.role !== 'employer') {
    redirect('/')
  }

  const params = await searchParams
  const [{ applicants, pagination }, { listings }] = await Promise.all([
    serviceListEmployerApplicants({
      listingId: params?.listingId,
      page: params?.page,
    }),
    serviceListMyEmployerJobListings(),
  ])

  return (
    <EmployerApplicantsClient
      currentUser={user}
      applicants={applicants}
      pagination={pagination}
      listings={listings}
      activeListingId={params?.listingId ?? ''}
    />
  )
}