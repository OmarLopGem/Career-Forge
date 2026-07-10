import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId } from '@/lib/server/object-id.js'

export const USER_PROFILES_COLLECTION = 'user_profiles'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(USER_PROFILES_COLLECTION)

  await collection.createIndexes([
    { key: { userId: 1 }, unique: true, name: 'user_profiles_user_id_unique' },
  ])

  return collection
}

function toUserProfile(doc) {
  return stringifyId(doc)
}

export async function getUserProfileByUserId(userId) {
  const collection = await getCollection()
  const doc = await collection.findOne({ userId })
  return doc ? toUserProfile(doc) : null
}

export async function upsertUserProfile(userId, data) {
  const collection = await getCollection()
  const now = new Date().toISOString()

  await collection.updateOne(
    { userId },
    {
      $set: {
        photoUrl: data.photoUrl,
        headline: data.headline,
        description: data.description,
        skills: data.skills,
        experience: data.experience,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        userId,
        createdAt: now,
      },
    },
    { upsert: true },
  )

  return getUserProfileByUserId(userId)
}
