import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceGetMyProfile } from '@/lib/server/profile/user-profile.service.js'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/profile')
  }

  const { profile } = await serviceGetMyProfile()

  return <ProfileClient currentUser={currentUser} initialProfile={profile} />
}
