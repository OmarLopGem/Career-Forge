export const JOB_ROLE_CATEGORIES = [
  {
    category: 'Technology',
    roles: [
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Software Developer',
      'Mobile App Developer',
      'QA Tester',
      'Data Analyst',
      'Database Developer',
      'IT Support Specialist',
      'Cybersecurity Analyst',
    ],
  },
  {
    category: 'Business and Administration',
    roles: [
      'Front Desk Representative',
      'Customer Service Representative',
      'Sales Representative',
      'Receptionist',
      'Administrative Assistant',
      'Office Administrator',
      'Project Coordinator',
      'Human Resources Assistant',
      'Bookkeeper',
      'Marketing Coordinator',
    ],
  },
  {
    category: 'Skilled Trades',
    roles: [
      'Automotive Mechanic',
      'Industrial Mechanic',
      'Electrician',
      'Plumber',
      'HVAC Technician',
      'Carpenter',
      'Welder',
      'Construction Labourer',
      'Heavy Equipment Operator',
      'Maintenance Technician',
    ],
  },
  {
    category: 'Healthcare and Community Services',
    roles: [
      'Personal Support Worker',
      'Medical Office Assistant',
      'Pharmacy Assistant',
      'Dental Assistant',
      'Early Childhood Educator',
      'Social Service Worker',
      'Veterinary Assistant',
      'Fitness Trainer',
    ],
  },
  {
    category: 'Hospitality, Retail, and Operations',
    roles: [
      'Retail Sales Associate',
      'Restaurant Server',
      'Barista',
      'Cook',
      'Hotel Front Desk Agent',
      'Housekeeper',
      'Warehouse Associate',
      'Delivery Driver',
      'Security Guard',
      'Call Centre Representative',
    ],
  },
]

export const JOB_ROLES = JOB_ROLE_CATEGORIES.flatMap(({ roles }) => roles)

export const DEFAULT_AI_SEED_TARGET_PER_ROLE = 30
export const DEFAULT_AI_SEED_TOTAL = JOB_ROLES.length * DEFAULT_AI_SEED_TARGET_PER_ROLE
export const DEFAULT_AI_BANK_LIMIT_PER_ROLE = 40
export const DEFAULT_AI_BANK_LIMIT_TOTAL = JOB_ROLES.length * DEFAULT_AI_BANK_LIMIT_PER_ROLE

export function isSupportedJobRole(value) {
  return JOB_ROLES.includes(String(value ?? '').trim())
}
