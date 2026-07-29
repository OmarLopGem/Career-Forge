import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  closeMongooseForTests,
  getMongooseConnection,
} from '@/lib/db/mongoose.js'

let server = null

export async function startMongo() {
  if (server) return
  server = await MongoMemoryServer.create()
  process.env.MONGODB_URI = server.getUri('cv-test')
  process.env.MONGODB_DB = 'career_forge_test'
  process.env.NODE_ENV = 'test'
  await closeMongooseForTests()
  await getMongooseConnection()
}

export async function stopMongo() {
  await closeMongooseForTests()
  if (server) {
    await server.stop()
    server = null
  }
}

export async function clearMongo() {
  const connection = await getMongooseConnection()
  await connection.dropDatabase()
}
