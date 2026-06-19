import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const USERS_COLLECTION = 'users'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(USERS_COLLECTION)

  await collection.createIndexes([
    { key: { email: 1 }, unique: true, name: 'users_email_unique' },
  ])

  return collection
}

function toUser(doc) {
  return stringifyId(doc)
}

export function toSafeUser(user) {
  if (!user) return null

  const { passwordHash, ...safeUser } = user
  return safeUser
}

export async function createUser(data) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const user = {
    _id: new ObjectId(),
    email: data.email,
    passwordHash: data.passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role ?? 'user',
    status: data.status ?? 'active',
    createdAt: now,
    updatedAt: now,
  }

  await collection.insertOne(user)
  return toUser(user)
}

export async function getUserByEmail(email) {
  const collection = await getCollection()
  const doc = await collection.findOne({ email })
  return doc ? toUser(doc) : null
}

export async function getUserById(userId) {
  const collection = await getCollection()
  const oid = toObjectId(userId)
  if (!oid) return null
  const doc = await collection.findOne({ _id: oid })
  return doc ? toUser(doc) : null
}
