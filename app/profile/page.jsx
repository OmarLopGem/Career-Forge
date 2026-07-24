import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceGetMyProfile } from '@/lib/server/profile/user-profile.service.js'

export const dynamic = 'force-dynamic'

// The profile page resolves auth and combines account identity with the user's
// professional CV workspaces before the client hydrates.
export default async function ProfilePage() {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/profile')
  }

  const { account, profiles, warnings } = await serviceGetMyProfile()

  return (
    <ProfileClient
      currentUser={currentUser}
      initialAccount={account}
      initialProfiles={profiles}
      initialWarnings={warnings}
    />
  )
}
