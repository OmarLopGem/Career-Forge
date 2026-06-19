import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const JOB_LISTINGS_COLLECTION = 'job_listings'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(JOB_LISTINGS_COLLECTION)

  await collection.createIndexes([
    { key: { isActive: 1, updatedAt: -1 }, name: 'job_listings_active_updated' },
    { key: { category: 1, isActive: 1 }, name: 'job_listings_category_active' },
    { key: { requiredSkills: 1 }, name: 'job_listings_required_skills' },
    {
      key: { source: 1, externalId: 1 },
      unique: true,
      sparse: true,
      name: 'job_listings_source_external_id',
    },
  ])

  return collection
}

function toListing(doc) {
  return stringifyId(doc)
}

export async function listActiveJobListings() {
  const collection = await getCollection()
  const docs = await collection
    .find({ isActive: true })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray()

  return docs.map(toListing)
}

export async function getJobListingById(listingId) {
  const collection = await getCollection()
  const oid = toObjectId(listingId)
  if (!oid) return null
  const doc = await collection.findOne({ _id: oid, isActive: true })
  return doc ? toListing(doc) : null
}

export async function upsertJobListing(data) {
  const collection = await getCollection()
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

  await collection.updateOne(
    filter,
    {
      $set: toSet,
      $setOnInsert: {
        _id: new ObjectId(),
        createdAt: now,
      },
    },
    { upsert: true },
  )

  const doc = await collection.findOne(filter)
  return doc ? toListing(doc) : null
}
