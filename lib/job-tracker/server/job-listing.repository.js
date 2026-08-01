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

function normalizePagination(page = 1, pageSize = 20) {
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1)
  const normalizedPageSize = Math.min(50, Math.max(1, Number.parseInt(pageSize, 10) || 20))

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
