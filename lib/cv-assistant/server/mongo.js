import { MongoClient } from 'mongodb'
import { loadProjectEnv } from '@/lib/server/load-env-file.js'

function getUri() {
  loadProjectEnv()
  return process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017'
}

function getDbName() {
  loadProjectEnv()
  return process.env.MONGODB_DB ?? 'career_forge'
}

function buildClient() {
  return new MongoClient(getUri(), {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })
}

async function getClient() {
  const uri = getUri()
  if (!globalThis.__cvAssistantMongoClient) {
    globalThis.__cvAssistantMongoClient = buildClient()
    globalThis.__cvAssistantMongoUri = uri
  } else if (globalThis.__cvAssistantMongoUri !== uri) {
    try {
      await globalThis.__cvAssistantMongoClient.close()
    } catch {}
    globalThis.__cvAssistantMongoClient = buildClient()
    globalThis.__cvAssistantMongoUri = uri
  }
  const client = globalThis.__cvAssistantMongoClient
  if (!globalThis.__cvAssistantMongoConnected) {
    await client.connect()
    globalThis.__cvAssistantMongoConnected = true
  }
  return client
}

export async function getMongoClient() {
  return getClient()
}

export async function getDb() {
  const client = await getClient()
  const dbName = getDbName()
  if (!globalThis.__cvAssistantMongoDb || globalThis.__cvAssistantMongoDbName !== dbName) {
    globalThis.__cvAssistantMongoDb = client.db(dbName)
    globalThis.__cvAssistantMongoDbName = dbName
  }
  return globalThis.__cvAssistantMongoDb
}

export const CV_PROFILE_COLLECTION = 'cv_profiles'
export const CV_ANALYSIS_COLLECTION = 'cv_analyses'

export async function closeMongoForTests() {
  if (globalThis.__cvAssistantMongoClient) {
    try {
      await globalThis.__cvAssistantMongoClient.close()
    } catch {}
    globalThis.__cvAssistantMongoClient = undefined
    globalThis.__cvAssistantMongoUri = undefined
    globalThis.__cvAssistantMongoConnected = false
    globalThis.__cvAssistantMongoDb = undefined
    globalThis.__cvAssistantMongoDbName = undefined
  }
}
