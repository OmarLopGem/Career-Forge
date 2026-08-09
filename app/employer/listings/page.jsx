import { redirect } from 'next/navigation'
import EmployerListingsClient from './EmployerListingsClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListMyEmployerJobListings } from '@/lib/job-tracker/server/employer-listing.service.js'
import { getEmployerByOwner } from '@/lib/db/models/employer.js'

export const dynamic = 'force-dynamic'

export default async function EmployerListingsPage() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect('/login?redirectTo=/employer/listings')
  }

  if (user.role !== 'employer') {
    redirect('/')
  }

  const employer = await getEmployerByOwner(user._id)
  const { listings } = await serviceListMyEmployerJobListings()

  return (
    <EmployerListingsClient
      currentUser={user}
      employer={employer}
      initialListings={listings}
    />
  )
}