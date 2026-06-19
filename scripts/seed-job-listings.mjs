import { MongoClient, ObjectId } from 'mongodb'
import fs from 'node:fs'
import path from 'node:path'

function parseEnvLine(line) {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const separatorIndex = trimmed.indexOf('=')

  if (separatorIndex === -1) {
    return null
  }

  const key = trimmed.slice(0, separatorIndex).trim()
  let value = trimmed.slice(separatorIndex + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return { key, value }
}

function loadProjectEnv() {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, '.env.download'),
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
  ]

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue

    const contents = fs.readFileSync(filePath, 'utf8')
    const lines = contents.split(/\r?\n/)

    for (const line of lines) {
      const parsed = parseEnvLine(line)
      if (!parsed) continue

      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value
      }
    }
  }
}

loadProjectEnv()

const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGODB_DB ?? 'career_forge'

const listings = [
  {
    externalId: 'seed-frontend-001',
    source: 'Career Forge Seed',
    title: 'Frontend Developer',
    company: 'Northstar Commerce',
    location: 'Toronto, ON',
    description: 'Build React interfaces, improve accessibility, and collaborate with product designers on customer-facing experiences.',
    salaryMin: 62000,
    salaryMax: 78000,
    url: 'https://example.com/jobs/frontend-developer',
    requiredSkills: ['React', 'JavaScript', 'CSS', 'Accessibility'],
    category: 'Frontend Development',
    employmentType: 'Full-time',
    postedAt: '2026-06-10',
    isActive: true,
  },
  {
    externalId: 'seed-frontend-002',
    source: 'Career Forge Seed',
    title: 'Junior Web Developer',
    company: 'Atlas Credit Union',
    location: 'Remote',
    description: 'Support landing pages, web forms, and small React features across the public marketing site.',
    salaryMin: 54000,
    salaryMax: 68000,
    url: 'https://example.com/jobs/junior-web-developer',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'Git'],
    category: 'Web Development',
    employmentType: 'Full-time',
    postedAt: '2026-06-09',
    isActive: true,
  },
  {
    externalId: 'seed-qa-001',
    source: 'Career Forge Seed',
    title: 'QA Analyst',
    company: 'Blue Harbor Systems',
    location: 'Waterloo, ON',
    description: 'Execute manual and automated test cases for web releases and maintain bug documentation for engineering teams.',
    salaryMin: 56000,
    salaryMax: 72000,
    url: 'https://example.com/jobs/qa-analyst',
    requiredSkills: ['Testing', 'Bug Tracking', 'Regression Testing', 'Communication'],
    category: 'QA',
    employmentType: 'Full-time',
    postedAt: '2026-06-08',
    isActive: true,
  },
  {
    externalId: 'seed-data-001',
    source: 'Career Forge Seed',
    title: 'Junior Data Analyst',
    company: 'Maple Insights',
    location: 'Mississauga, ON',
    description: 'Prepare dashboards, clean datasets, and communicate reporting trends to internal stakeholders.',
    salaryMin: 58000,
    salaryMax: 74000,
    url: 'https://example.com/jobs/junior-data-analyst',
    requiredSkills: ['SQL', 'Excel', 'Data Visualization', 'Statistics'],
    category: 'Data Analysis',
    employmentType: 'Full-time',
    postedAt: '2026-06-07',
    isActive: true,
  },
  {
    externalId: 'seed-support-001',
    source: 'Career Forge Seed',
    title: 'IT Support Specialist',
    company: 'CedarWorks Health',
    location: 'Kitchener, ON',
    description: 'Resolve user tickets, set up workstations, and document recurring support solutions.',
    salaryMin: 50000,
    salaryMax: 64000,
    url: 'https://example.com/jobs/it-support-specialist',
    requiredSkills: ['Troubleshooting', 'Windows', 'Documentation', 'Customer Support'],
    category: 'IT Support',
    employmentType: 'Full-time',
    postedAt: '2026-06-06',
    isActive: true,
  },
  {
    externalId: 'seed-react-001',
    source: 'Career Forge Seed',
    title: 'React Developer',
    company: 'Prairie Labs',
    location: 'Remote',
    description: 'Ship reusable React components, integrate APIs, and collaborate on frontend performance improvements.',
    salaryMin: 68000,
    salaryMax: 86000,
    url: 'https://example.com/jobs/react-developer',
    requiredSkills: ['React', 'TypeScript', 'REST APIs', 'Tailwind CSS'],
    category: 'Frontend Development',
    employmentType: 'Full-time',
    postedAt: '2026-06-05',
    isActive: true,
  },
  {
    externalId: 'seed-web-003',
    source: 'Career Forge Seed',
    title: 'Web Content Developer',
    company: 'Lighthouse Media',
    location: 'Hamilton, ON',
    description: 'Publish content pages, support CMS updates, and help optimize landing pages for campaign launches.',
    salaryMin: 51000,
    salaryMax: 65000,
    url: 'https://example.com/jobs/web-content-developer',
    requiredSkills: ['HTML', 'CMS', 'SEO', 'Content Editing'],
    category: 'Web Development',
    employmentType: 'Contract',
    postedAt: '2026-06-04',
    isActive: true,
  },
  {
    externalId: 'seed-qa-002',
    source: 'Career Forge Seed',
    title: 'Automation QA Tester',
    company: 'Orbit Payroll',
    location: 'Remote',
    description: 'Write browser-based tests, validate release candidates, and work closely with developers on regression coverage.',
    salaryMin: 65000,
    salaryMax: 80000,
    url: 'https://example.com/jobs/automation-qa-tester',
    requiredSkills: ['Test Automation', 'JavaScript', 'Playwright', 'Quality Assurance'],
    category: 'QA',
    employmentType: 'Full-time',
    postedAt: '2026-06-03',
    isActive: true,
  },
  {
    externalId: 'seed-data-002',
    source: 'Career Forge Seed',
    title: 'Reporting Analyst',
    company: 'Summit Telecom',
    location: 'Brampton, ON',
    description: 'Turn recurring operational data into dashboards and weekly reporting packages for leadership.',
    salaryMin: 60000,
    salaryMax: 76000,
    url: 'https://example.com/jobs/reporting-analyst',
    requiredSkills: ['SQL', 'Power BI', 'Excel', 'Data Storytelling'],
    category: 'Data Analysis',
    employmentType: 'Full-time',
    postedAt: '2026-06-02',
    isActive: true,
  },
  {
    externalId: 'seed-support-002',
    source: 'Career Forge Seed',
    title: 'Technical Support Coordinator',
    company: 'Polar Retail',
    location: 'Remote',
    description: 'Coordinate escalations, maintain knowledge base content, and support SaaS customers during onboarding.',
    salaryMin: 52000,
    salaryMax: 67000,
    url: 'https://example.com/jobs/technical-support-coordinator',
    requiredSkills: ['Customer Support', 'Documentation', 'SaaS', 'Troubleshooting'],
    category: 'IT Support',
    employmentType: 'Full-time',
    postedAt: '2026-06-01',
    isActive: true,
  },
]

async function seedJobListings() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })

  try {
    await client.connect()
    const db = client.db(dbName)
    const collection = db.collection('job_listings')

    await collection.createIndexes([
      { key: { isActive: 1, updatedAt: -1 }, name: 'job_listings_active_updated' },
      { key: { category: 1, isActive: 1 }, name: 'job_listings_category_active' },
      { key: { requiredSkills: 1 }, name: 'job_listings_required_skills' },
      {
        key: { source: 1, externalId: 1 },
        unique: true,
        sparse: true,
        name: 'job_listings_source_external_id',
      },
    ])

    for (const listing of listings) {
      const now = new Date().toISOString()

      await collection.updateOne(
        { source: listing.source, externalId: listing.externalId },
        {
          $set: {
            ...listing,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            createdAt: now,
          },
        },
        { upsert: true },
      )
    }

    console.log(`Seeded ${listings.length} job listings into ${dbName}.`)
  } finally {
    await client.close()
  }
}

seedJobListings().catch((error) => {
  console.error('Failed to seed job listings.')
  console.error(error)
  process.exitCode = 1
})
