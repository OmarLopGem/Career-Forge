import { AppServiceError } from '@/lib/server/api-error.js'
import { requireEmployerUser } from '@/lib/server/auth/current-user.js'
import { getEmployerByOwner } from '@/lib/db/models/employer.js'
import { getJobApplicationModel } from '@/lib/db/models/job-application.js'
import { getJobListingModel } from '@/lib/db/models/job-listing.js'
import { getCvProfileModel } from '@/lib/db/models/cv-profile.js'
import { getUserModel } from '@/lib/db/models/user.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'
import { serviceCreateUserNotification } from '@/lib/server/notifications/notification.service.js'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

async function resolveEmployer() {
  const user = await requireEmployerUser()
  const employer = await getEmployerByOwner(user._id)
  if (!employer) {
    throw new AppServiceError(
      'No employer profile is associated with this account.',
      'EMPLOYER_PROFILE_MISSING',
      400,
    )
  }
  if (employer.status !== 'verified') {
    throw new AppServiceError(
      'Your employer account is not verified yet.',
      'EMPLOYER_NOT_VERIFIED',
      403,
    )
  }
  return { user, employer }
}

async function listOwnedListingIds(userId) {
  const ListingModel = await getJobListingModel()
  const oid = toObjectId(userId)
  if (!oid) return []
  const userIdString = oid.toString()
  const docs = await ListingModel.find({
    $or: [{ postedByUserId: userIdString }, { postedByUserId: oid }],
  }).select({ _id: 1 })
  return docs.map((doc) => String(doc._id))
}

function sanitizeApplication(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

function sanitizeCandidate(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { passwordHash, ...safeUser } = obj
  return {
    _id: safeUser._id ? String(safeUser._id) : undefined,
    firstName: safeUser.firstName ?? '',
    lastName: safeUser.lastName ?? '',
    email: safeUser.email ?? '',
    headline: safeUser.headline ?? '',
    photoUrl: safeUser.photoUrl ?? '',
    location: safeUser.location ?? '',
  }
}

export async function serviceListEmployerApplicants({ listingId, page, pageSize } = {}) {
  const { user } = await resolveEmployer()

  const ownedListingIds = await listOwnedListingIds(user._id)
  if (ownedListingIds.length === 0) {
    return {
      applicants: [],
      pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 },
    }
  }

  const listingObjectIds = ownedListingIds
    .map((id) => toObjectId(id))
    .filter(Boolean)
  const listingIdStrings = listingObjectIds.map((id) => id.toString())

  const query = {
    deletedAt: null,
    $or: [
      { jobListingId: { $in: listingObjectIds } },
      { jobListingId: { $in: listingIdStrings } },
    ],
  }

  if (listingId) {
    const targetOid = toObjectId(listingId)
    if (!targetOid) {
      throw new AppServiceError('Invalid listing id.', 'INVALID_LISTING_ID', 400)
    }
    if (!listingObjectIds.find((id) => String(id) === String(targetOid))) {
      throw new AppServiceError(
        'You can only view applicants for your own listings.',
        'FORBIDDEN',
        403,
      )
    }
    const targetString = targetOid.toString()
    query.$or = [
      { jobListingId: targetOid },
      { jobListingId: targetString },
    ]
  }

  const safePage = Math.max(1, Number.parseInt(page, 10) || 1)
  const safePageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE),
  )

  const ApplicationModel = await getJobApplicationModel()

  const [docs, total] = await Promise.all([
    ApplicationModel.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip((safePage - 1) * safePageSize)
      .limit(safePageSize),
    ApplicationModel.countDocuments(query),
  ])

  const applications = docs.map(sanitizeApplication)

  const candidateIds = applications.map((app) => app.userId)
  let candidatesById = new Map()
  if (candidateIds.length > 0) {
    const UserModel = await getUserModel()
    const objectIds = candidateIds
      .map((id) => toObjectId(id))
      .filter(Boolean)
    if (objectIds.length > 0) {
      const userDocs = await UserModel.find({ _id: { $in: objectIds } })
      candidatesById = new Map(
        userDocs
          .map((doc) => sanitizeCandidate(doc))
          .filter(Boolean)
          .map((candidate) => [String(candidate._id), candidate]),
      )
    }
  }

  const enrichedApplicants = applications.map((application) => ({
    application,
    candidate: candidatesById.get(String(application.userId)) ?? null,
  }))

  return {
    applicants: enrichedApplicants,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / safePageSize),
    },
  }
}

export async function serviceGetEmployerApplicant(applicationId) {
  const { user } = await resolveEmployer()

  const ownedListingIds = await listOwnedListingIds(user._id)
  if (ownedListingIds.length === 0) {
    throw new AppServiceError('Application not found.', 'JOB_APPLICATION_NOT_FOUND', 404)
  }

  const applicationOid = toObjectId(applicationId)
  if (!applicationOid) {
    throw new AppServiceError('Invalid application id.', 'INVALID_APPLICATION_ID', 400)
  }

  const listingObjectIds = ownedListingIds
    .map((id) => toObjectId(id))
    .filter(Boolean)

  const ApplicationModel = await getJobApplicationModel()
  const application = await ApplicationModel.findOne({
    _id: applicationOid,
    deletedAt: null,
    $or: [
      { jobListingId: { $in: listingObjectIds } },
      { jobListingId: { $in: ownedListingIds } },
    ],
  })

  if (!application) {
    throw new AppServiceError('Application not found.', 'JOB_APPLICATION_NOT_FOUND', 404)
  }

  const applicationObj = sanitizeApplication(application)
  const UserModel = await getUserModel()
  const candidateOid = toObjectId(application.userId)
  const candidateDoc = candidateOid
    ? await UserModel.findById(candidateOid)
    : null
  const candidate = sanitizeCandidate(candidateDoc)

  return {
    application: applicationObj,
    candidate,
  }
}

function sanitizePersonalInfoForEmployer(personalInfo) {
  if (!personalInfo || typeof personalInfo !== 'object') return {}
  const {
    phone,
    dateOfBirth,
    ...safe
  } = personalInfo
  return safe
}

function sanitizeCvProfileForEmployer(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const {
    _id,
    userId,
    isDefault,
    completion,
    createdAt,
    updatedAt,
    personalInfo,
    ...rest
  } = obj
  return {
    ...rest,
    personalInfo: sanitizePersonalInfoForEmployer(personalInfo),
  }
}

const viewedApplicantKeys = new Set()

export async function serviceGetEmployerApplicantProfile(applicationId) {
  const { user, employer } = await resolveEmployer()

  const detail = await serviceGetEmployerApplicant(applicationId)

  let profile = null
  const cvProfileId = detail.application.cvProfileId
  if (cvProfileId) {
    const profileOid = toObjectId(cvProfileId)
    if (profileOid) {
      const CvProfileModel = await getCvProfileModel()
      const doc = await CvProfileModel.findById(profileOid)
      profile = sanitizeCvProfileForEmployer(doc)
    }
  }

  const dedupKey = `${user._id}:${detail.application._id}`
  if (!viewedApplicantKeys.has(dedupKey)) {
    viewedApplicantKeys.add(dedupKey)
    const listingTitle = detail.application.jobSnapshot?.title ?? 'your application'
    await serviceCreateUserNotification({
      createdByUserId: user._id,
      targetUserId: detail.application.userId,
      title: 'An employer viewed your profile',
      message: `${employer.name} opened your CV for the application to ${listingTitle}.`,
      level: 'info',
      link: '/profile',
    })
  }

  return {
    application: detail.application,
    candidate: detail.candidate,
    profile,
  }
}

export function __resetEmployerApplicantProfileDedupForTests() {
  viewedApplicantKeys.clear()
}