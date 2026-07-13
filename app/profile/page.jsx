import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceGetMyProfile } from '@/lib/server/profile/user-profile.service.js'

export const dynamic = 'force-dynamic'

// The profile page resolves auth and the user's editable profile on the server,
// then hands a stable snapshot to the client form.
export default async function ProfilePage() {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/profile')
  }

  const { account, profiles } = await serviceGetMyProfile()

  return (
    <ProfileClient
      currentUser={currentUser}
      initialAccount={account}
      initialProfiles={profiles}
    />
  )
}
