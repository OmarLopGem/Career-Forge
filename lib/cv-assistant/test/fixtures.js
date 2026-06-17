function nowMinus(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

const personalInfo = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555 1234',
  location: 'Remote',
  linkedinUrl: 'https://linkedin.com/in/jane',
  githubUrl: 'https://github.com/jane',
}

const skills = [
  { category: 'Frontend', items: ['React', 'Next.js', 'TypeScript'] },
  { category: 'Backend', items: ['Node.js'] },
]

const experience = [
  {
    company: 'Acme',
    position: 'Senior Frontend Engineer',
    startDate: '2022-01',
    endDate: null,
    isCurrent: true,
    highlights: [
      'Improved Lighthouse score from 62 to 95 across the marketing site.',
      'Led migration of the dashboard to React Server Components.',
    ],
    technologies: ['React', 'Next.js', 'TypeScript'],
  },
  {
    company: 'Globex',
    position: 'Frontend Engineer',
    startDate: '2019-06',
    endDate: '2021-12',
    highlights: ['Built the design system used by 6 product teams.'],
    technologies: ['React'],
  },
]

const draft = {
  personalInfo,
  target: { desiredRole: 'Senior Frontend Engineer', seniority: 'senior' },
  professionalSummary:
    'Frontend engineer with 6+ years building production React applications.',
  experience,
  education: [
    { institution: 'State University', degree: 'B.Sc.', fieldOfStudy: 'Computer Science', endDate: '2018' },
  ],
  skills,
  projects: [
    {
      name: 'Open UI Kit',
      description: 'A small design system for the community.',
      highlights: ['1.2k stars on GitHub'],
      technologies: ['React', 'TypeScript'],
      url: 'https://open-ui.dev',
    },
  ],
  certifications: [],
  languages: [{ name: 'English', proficiency: 'native' }, { name: 'Spanish', proficiency: 'professional' }],
  links: [{ label: 'GitHub', url: 'https://github.com/jane', type: 'github' }],
}

export const minimalValidProfile = {
  _id: 'profile-min-1',
  userId: 'user-1',
  title: 'Minimal Profile',
  isDefault: true,
  source: { type: 'mock' },
  personalInfo,
  target: { desiredRole: 'Engineer' },
  professionalSummary: 'Profile summary.',
  experience,
  education: [{ institution: 'State University' }],
  skills,
  projects: [],
  certifications: [],
  languages: [],
  links: [],
  completion: {
    isMinimumComplete: true,
    score: 60,
    missingRequiredFields: [],
    missingRecommendedFields: [],
    sectionScores: {},
    lastCheckedAt: nowMinus(1),
  },
  createdAt: nowMinus(7),
  updatedAt: nowMinus(1),
}

export const frontendProfile = {
  _id: 'profile-fe-1',
  userId: 'user-1',
  title: 'Frontend Engineer Profile',
  isDefault: true,
  source: { type: 'mock' },
  ...draft,
  completion: {
    isMinimumComplete: true,
    score: 80,
    missingRequiredFields: [],
    missingRecommendedFields: [],
    sectionScores: {},
    lastCheckedAt: nowMinus(1),
  },
  createdAt: nowMinus(14),
  updatedAt: nowMinus(1),
}

export const incompleteProfile = {
  _id: 'profile-inc-1',
  userId: 'user-1',
  title: 'Incomplete Profile',
  isDefault: false,
  source: { type: 'mock' },
  personalInfo: { fullName: '' },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  links: [],
  completion: {
    isMinimumComplete: false,
    score: 0,
    missingRequiredFields: ['Full name', 'At least one contact method', 'At least 3 skills'],
    missingRecommendedFields: [],
    sectionScores: {},
    lastCheckedAt: nowMinus(1),
  },
  createdAt: nowMinus(30),
  updatedAt: nowMinus(30),
}

export const mockTechnicalCVText = `
Jane Doe
jane@example.com | https://github.com/jane

Summary
Frontend engineer with 6+ years building React and Next.js applications.

Experience
Senior Frontend Engineer - Acme
- Improved Lighthouse score from 62 to 95.
- Led migration to React Server Components.

Skills
React, Next.js, TypeScript, Node.js, Tailwind CSS

Projects
Open UI Kit - https://open-ui.dev - 1.2k stars
`

export const mockEmptyCVText = ''
