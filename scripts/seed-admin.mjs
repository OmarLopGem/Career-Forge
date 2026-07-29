import { loadProjectEnv } from '../lib/server/load-env-file.mjs'
import { hashPassword } from '../lib/server/auth/password.js'
import { getMongooseConnection } from '../lib/db/mongoose.js'
import { getUserModel } from '../lib/db/models/user.js'

loadProjectEnv()
const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@careerforge.com').trim().toLowerCase()
const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123'
const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? 'Career'
const lastName = process.env.SEED_ADMIN_LAST_NAME ?? 'Forge Admin'

async function seedAdmin() {
  let connection = null

  try {
    connection = await getMongooseConnection()
    const User = await getUserModel()
    const now = new Date().toISOString()
    const passwordHash = await hashPassword(password)

    await User.createIndexes()

    await User.updateOne(
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
          createdAt: now,
        },
      },
      { upsert: true },
    )

    console.log(`Seeded admin user ${email} into ${connection.name}.`)
  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

seedAdmin().catch((error) => {
  console.error('Failed to seed admin user.')
  console.error(error)
  process.exitCode = 1
})
