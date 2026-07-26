import { getJobListingModel } from '@/lib/db/models/job-listing.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const JOB_LISTINGS_COLLECTION = 'job_listings'

function toListing(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

async function getModel() {
  return getJobListingModel()
}

export async function listActiveJobListings() {
  const Model = await getModel()
  const docs = await Model.find({ isActive: true }).sort({
    updatedAt: -1,
    createdAt: -1,
  })

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

export async function upsertJobListing(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const filter = data.externalId
    ? { source: data.source, externalId: data.externalId }
    : { source: data.source, title: data.title, company: data.company, location: data.location }

  const toSet = {
    source: data.source,
    externalId: data.externalId ?? null,
    title: data.title,
    company: data.company,
    location: data.location,
    description: data.description,
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    url: data.url ?? null,
    requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
    category: data.category,
    employmentType: data.employmentType ?? null,
    postedAt: data.postedAt ?? null,
    isActive: data.isActive ?? true,
    updatedAt: now,
  }

  await Model.updateOne(
    filter,
    {
      $set: toSet,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  )

  const doc = await Model.findOne(filter)
  return doc ? toListing(doc) : null
}