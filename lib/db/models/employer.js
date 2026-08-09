import { getModel } from './_factory.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

let modelPromise = null

const EMPLOYER_STATUSES = ['pending', 'verified', 'suspended']
export const ALLOWED_EMPLOYER_STATUSES = EMPLOYER_STATUSES

function buildSchema(Schema) {
  const schema = new Schema(
    {
      ownerUserId: { type: Schema.Types.Mixed, required: true },
      name: { type: String, required: true },
      website: { type: String, default: '' },
      industry: { type: String, default: '' },
      size: { type: String, default: '' },
      description: { type: String, default: '' },
      status: { type: String, default: 'pending' },
      verifiedByUserId: { type: Schema.Types.Mixed, default: null },
      verifiedAt: { type: String, default: null },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'employers' },
  )
  schema.index({ ownerUserId: 1 }, { name: 'employers_owner' })
  schema.index({ status: 1 }, { name: 'employers_status' })
  return schema
}

function toEmployer(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

export function getEmployerModel() {
  if (!modelPromise) {
    modelPromise = getModel('Employer', buildSchema)
  }
  return modelPromise
}

function sanitizeString(value) {
  return String(value ?? '').trim()
}

export async function createEmployer(data) {
  const Model = await getEmployerModel()
  const ownerOid = toObjectId(data.ownerUserId)
  if (!ownerOid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    // Placeholder owner (registration flow) is allowed so the employer row can be
    // inserted before the user document exists. The service that owns the flow
    // backfills the real owner id immediately afterwards.
    if (data.ownerUserId !== 'pending') {
      throw new AppServiceError('Invalid owner user id.', 'INVALID_USER_ID', 400)
    }
  }
  const now = new Date().toISOString()
  const doc = await Model.create({
    ownerUserId: ownerOid ? ownerOid.toString() : 'pending',
    name: sanitizeString(data.name),
    website: sanitizeString(data.website),
    industry: sanitizeString(data.industry),
    size: sanitizeString(data.size),
    description: sanitizeString(data.description),
    status: EMPLOYER_STATUSES.includes(data.status) ? data.status : 'pending',
    verifiedByUserId: null,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now,
  })
  return toEmployer(doc)
}

export async function getEmployerById(employerId) {
  const Model = await getEmployerModel()
  const oid = toObjectId(employerId)
  if (!oid) return null
  const doc = await Model.findById(oid)
  return doc ? toEmployer(doc) : null
}

export async function getEmployerByOwner(ownerUserId) {
  const Model = await getEmployerModel()
  const oid = toObjectId(ownerUserId)
  if (!oid) return null
  const ownerIdString = oid.toString()
  const doc = await Model.findOne({
    $or: [{ ownerUserId: ownerIdString }, { ownerUserId: oid }],
  })
  return doc ? toEmployer(doc) : null
}

export async function listEmployersByStatuses(statuses) {
  const Model = await getEmployerModel()
  const filteredStatuses = Array.isArray(statuses)
    ? statuses.filter((status) => EMPLOYER_STATUSES.includes(status))
    : []
  if (filteredStatuses.length === 0) return []
  const docs = await Model.find({ status: { $in: filteredStatuses } }).sort({
    updatedAt: -1,
    createdAt: -1,
  })
  return docs.map(toEmployer)
}

export async function listEmployers() {
  const Model = await getEmployerModel()
  const docs = await Model.find({}).sort({ updatedAt: -1, createdAt: -1 })
  return docs.map(toEmployer)
}

export async function setEmployerStatus(employerId, status, verifiedByUserId = null) {
  if (!EMPLOYER_STATUSES.includes(status)) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError(
      `Status must be one of: ${EMPLOYER_STATUSES.join(', ')}.`,
      'INVALID_STATUS',
      400,
    )
  }
  const oid = toObjectId(employerId)
  if (!oid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError('Invalid employer id.', 'INVALID_EMPLOYER_ID', 400)
  }
  const Model = await getEmployerModel()
  const now = new Date().toISOString()
  const update = { status, updatedAt: now }
  if (status === 'verified') {
    const verifiedOid = toObjectId(verifiedByUserId)
    update.verifiedByUserId = verifiedOid ? verifiedOid.toString() : null
    update.verifiedAt = now
  }
  const doc = await Model.findByIdAndUpdate(oid, { $set: update }, { new: true })
  return doc ? toEmployer(doc) : null
}