import { getJobListingModel } from '@/lib/db/models/job-listing.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

function toListing(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildActiveJobListingQuery({ what = '', where = '' } = {}) {
  const query = { isActive: true }
  const filters = []

  const normalizedWhat = String(what ?? '').trim()
  const normalizedWhere = String(where ?? '').trim()

  if (normalizedWhat) {
    const pattern = new RegExp(escapeRegex(normalizedWhat), 'i')
    filters.push({
      $or: [
        { title: pattern },
        { company: pattern },
        { description: pattern },
        { category: pattern },
        { employmentType: pattern },
      ],
    })
  }

  if (normalizedWhere) {
    filters.push({
      location: new RegExp(escapeRegex(normalizedWhere), 'i'),
    })
  }

  if (filters.length > 0) {
    query.$and = filters
  }

  return query
}

function normalizePagination(page = 1, pageSize = 30) {
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1)
  const normalizedPageSize = Math.min(50, Math.max(1, Number.parseInt(pageSize, 10) || 30))

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    skip: (normalizedPage - 1) * normalizedPageSize,
  }
}

async function getModel() {
  return getJobListingModel()
}

export async function countActiveJobListings(filters = {}) {
  const Model = await getModel()
  return Model.countDocuments(buildActiveJobListingQuery(filters))
}

export async function listActiveJobListings(filters = {}) {
  const Model = await getModel()
  const { page, pageSize, skip } = normalizePagination(filters.page, filters.pageSize)
  const docs = await Model.find(buildActiveJobListingQuery(filters))
    .sort({
      postedAt: -1,
      updatedAt: -1,
      createdAt: -1,
    })
    .skip(skip)
    .limit(pageSize)

  return docs.map(toListing)
}

export async function listJobListings() {
  const Model = await getModel()
  const docs = await Model.find({}).sort({
    isActive: -1,
    updatedAt: -1,
    createdAt: -1,
  })

  return docs.map(toListing)
}

export async function getJobListingById(listingId) {
  const Model = await getModel()
  const oid = toObjectId(listingId)
  if (!oid) return null
  const doc = await Model.findOne({ _id: oid, isActive: true })
  return doc ? toListing(doc) : null
}

export async function getJobListingByIdIncludingInactive(listingId) {
  const Model = await getModel()
  const oid = toObjectId(listingId)
  if (!oid) return null
  const doc = await Model.findById(oid)
  return doc ? toListing(doc) : null
}

export async function listJobListingsByEmployer(ownerUserId) {
  const Model = await getModel()
  const oid = toObjectId(ownerUserId)
  if (!oid) return []
  const ownerIdString = oid.toString()
  const docs = await Model.find({
    $or: [
      { postedByUserId: ownerIdString },
      { postedByUserId: oid },
    ],
  }).sort({ updatedAt: -1, createdAt: -1 })
  return docs.map(toListing)
}

export async function createEmployerJobListing(data) {
  const Model = await getModel()
  const ownerOid = toObjectId(data.postedByUserId)
  if (!ownerOid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError('Invalid owner user id.', 'INVALID_USER_ID', 400)
  }
  const now = new Date().toISOString()
  const doc = await Model.create({
    source: String(data.source ?? 'Career Forge Employer').trim(),
    externalId: null,
    title: String(data.title ?? '').trim(),
    company: String(data.company ?? '').trim(),
    location: String(data.location ?? '').trim(),
    description: String(data.description ?? '').trim(),
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    url: data.url ? String(data.url).trim() : null,
    requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
    category: String(data.category ?? '').trim(),
    employmentType: data.employmentType ?? null,
    postedAt: data.postedAt ?? now,
    isActive: true,
    postedByUserId: ownerOid.toString(),
    employerId: data.employerId ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return toListing(doc)
}

export async function updateEmployerJobListing(listingId, ownerUserId, patch) {
  const Model = await getModel()
  const oid = toObjectId(listingId)
  if (!oid) return null
  const ownerOid = toObjectId(ownerUserId)
  if (!ownerOid) return null
  const ownerIdString = ownerOid.toString()
  const update = { updatedAt: new Date().toISOString() }
  if (patch.title !== undefined) update.title = String(patch.title).trim()
  if (patch.company !== undefined) update.company = String(patch.company).trim()
  if (patch.location !== undefined) update.location = String(patch.location).trim()
  if (patch.description !== undefined) update.description = String(patch.description).trim()
  if (patch.salaryMin !== undefined) update.salaryMin = patch.salaryMin
  if (patch.salaryMax !== undefined) update.salaryMax = patch.salaryMax
  if (patch.url !== undefined) update.url = patch.url ? String(patch.url).trim() : null
  if (patch.requiredSkills !== undefined) {
    update.requiredSkills = Array.isArray(patch.requiredSkills) ? patch.requiredSkills : []
  }
  if (patch.category !== undefined) update.category = String(patch.category).trim()
  if (patch.employmentType !== undefined) update.employmentType = patch.employmentType

  const doc = await Model.findOneAndUpdate(
    {
      _id: oid,
      $or: [
        { postedByUserId: ownerIdString },
        { postedByUserId: ownerOid },
      ],
    },
    { $set: update },
    { new: true },
  )
  return doc ? toListing(doc) : null
}

export async function deactivateEmployerJobListing(listingId, ownerUserId) {
  const Model = await getModel()
  const oid = toObjectId(listingId)
  if (!oid) return null
  const ownerOid = toObjectId(ownerUserId)
  if (!ownerOid) return null
  const ownerIdString = ownerOid.toString()
  const doc = await Model.findOneAndUpdate(
    {
      _id: oid,
      $or: [
        { postedByUserId: ownerIdString },
        { postedByUserId: ownerOid },
      ],
    },
    { $set: { isActive: false, updatedAt: new Date().toISOString() } },
    { new: true },
  )
  return doc ? toListing(doc) : null
}

export async function upsertJobListings(jobListings) {
  const Model = await getModel()
  const uniqueListings = []
  const seenKeys = new Set()
  const now = new Date().toISOString()

  for (const listing of jobListings) {
    const source = String(listing?.source ?? '').trim()
    const externalId = String(listing?.externalId ?? '').trim()

    if (!source || !externalId) {
      continue
    }

    const key = `${source}:${externalId}`
    if (seenKeys.has(key)) {
      continue
    }

    seenKeys.add(key)
    uniqueListings.push({
      ...listing,
      source,
      externalId,
    })
  }

  if (uniqueListings.length === 0) {
    return []
  }

  await Model.bulkWrite(
    uniqueListings.map((listing) => ({
      updateOne: {
        filter: {
          source: listing.source,
          externalId: listing.externalId,
        },
        update: {
          $set: {
            title: listing.title,
            company: listing.company,
            location: listing.location ?? '',
            description: listing.description ?? '',
            salaryMin: listing.salaryMin ?? null,
            salaryMax: listing.salaryMax ?? null,
            url: listing.url ?? null,
            requiredSkills: Array.isArray(listing.requiredSkills) ? listing.requiredSkills : [],
            category: listing.category ?? '',
            employmentType: listing.employmentType ?? null,
            postedAt: listing.postedAt ?? null,
            isActive: listing.isActive !== false,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  )

  const docs = await Model.find({
    $or: uniqueListings.map((listing) => ({
      source: listing.source,
      externalId: listing.externalId,
    })),
  })

  const docsByKey = new Map(
    docs.map((doc) => {
      const listing = toListing(doc)
      return [`${listing.source}:${listing.externalId}`, listing]
    }),
  )

  return uniqueListings
    .map((listing) => docsByKey.get(`${listing.source}:${listing.externalId}`))
    .filter(Boolean)
}
