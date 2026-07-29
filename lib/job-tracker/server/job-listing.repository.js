import { getJobListingModel } from '@/lib/db/models/job-listing.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

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
