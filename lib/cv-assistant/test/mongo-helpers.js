import { MongoMemoryServer } from 'mongodb-memory-server'
import { closeMongoForTests, getMongoClient } from '../server/mongo.js'

let server = null

export async function startMongo() {
  if (server) return
  server = await MongoMemoryServer.create()
  process.env.MONGODB_URI = server.getUri('cv-test')
  process.env.MONGODB_DB = 'career_forge_test'
  process.env.NODE_ENV = 'test'
  await closeMongoForTests()
}

export async function stopMongo() {
  await closeMongoForTests()
  if (server) {
    await server.stop()
    server = null
  }
}

export async function clearMongo() {
  const client = await getMongoClient()
  const db = client.db(process.env.MONGODB_DB ?? 'career_forge_test')
  await db.dropDatabase()
}
