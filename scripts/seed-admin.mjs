import { MongoClient, ObjectId } from 'mongodb'
import { loadProjectEnv } from '../lib/server/load-env-file.mjs'
import { hashPassword } from '../lib/server/auth/password.js'

loadProjectEnv()

const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGODB_DB ?? 'career_forge'
const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@careerforge.com').trim().toLowerCase()
const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123'
const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? 'Career'
const lastName = process.env.SEED_ADMIN_LAST_NAME ?? 'Forge Admin'

async function seedAdmin() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })

  try {
    await client.connect()
    const db = client.db(dbName)
    const users = db.collection('users')
    const now = new Date().toISOString()
    const passwordHash = await hashPassword(password)

    await users.createIndexes([
      { key: { email: 1 }, unique: true, name: 'users_email_unique' },
    ])

    await users.updateOne(
      { email },
      {
        $set: {
          firstName,
          lastName,
          email,
          passwordHash,
          role: 'admin',
          status: 'active',
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
        },
      },
      { upsert: true },
    )

    console.log(`Seeded admin user ${email} into ${dbName}.`)
  } finally {
    await client.close()
  }
}

seedAdmin().catch((error) => {
  console.error('Failed to seed admin user.')
  console.error(error)
  process.exitCode = 1
})
