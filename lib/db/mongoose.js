import mongoose from 'mongoose'

function getUri() {
  return process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017'
}

function getDbName() {
  return process.env.MONGODB_DB ?? 'career_forge'
}

// Reuse a single Mongoose connection per process so Next hot reloads and
// repeated tests do not open a new pool on every import.
async function getConnection() {
  const uri = getUri()
  const dbName = getDbName()

  if (globalThis.__cvAssistantMongooseSig === `${uri}::${dbName}`) {
    if (mongoose.connection.readyState === 1) return mongoose.connection
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve)
      mongoose.connection.once('error', reject)
    })
    return mongoose.connection
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect().catch(() => {})
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
    dbName,
  })

  globalThis.__cvAssistantMongooseSig = `${uri}::${dbName}`
  return mongoose.connection
}

export async function getMongooseConnection() {
  return getConnection()
}

export async function closeMongooseForTests() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect()
    } catch {}
  }
  globalThis.__cvAssistantMongooseSig = null
}

export async function clearMongoose() {
  const conn = await getConnection()
  const collections = await conn.db.listCollections().toArray()
  await Promise.all(
    collections.map(async (collection) => {
      try {
        await conn.db.collection(collection.name).deleteMany({})
      } catch {}
    }),
  )
}