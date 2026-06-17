export const CV_TEMPLATE_CATALOG = [
  {
    key: 'harvard-classic',
    name: 'Harvard Classic',
    description:
      'Clean academic/professional format. Conservative, readable and trusted for traditional industries.',
    category: 'classic',
    bestFor: [
      'students',
      'internships',
      'business roles',
      'consulting',
      'finance',
      'academic-adjacent profiles',
      'general professional applications',
    ],
    requiredFields: [
      { key: 'fullName', label: 'Full name', kind: 'field', paths: ['personalInfo.fullName'], severity: 'required' },
      { key: 'contact_method', label: 'At least one contact method', kind: 'contact_method', severity: 'required' },
      { key: 'experience_or_education', label: 'Experience or education', kind: 'one_of', paths: ['experience', 'education'], severity: 'required' },
      { key: 'min_skills', label: 'At least 3 skills', kind: 'min_count', paths: ['skills'], minCount: 3, severity: 'required' },
    ],
    recommendedFields: [
      { key: 'education', label: 'Education entries', kind: 'field', paths: ['education'], severity: 'recommended' },
      { key: 'experience_highlights', label: 'Experience highlights', kind: 'field', paths: ['experience.highlights'], severity: 'recommended' },
      { key: 'projects', label: 'Projects or leadership', kind: 'field', paths: ['projects'], severity: 'recommended' },
      { key: 'links', label: 'Professional links', kind: 'field', paths: ['links'], severity: 'recommended' },
    ],
    supportedFormats: ['pdf'],
  },
  {
    key: 'ats-simple',
    name: 'ATS Simple',
    description:
      'Safest format for online applications and applicant tracking systems. Clear and parse-friendly.',
    category: 'ats',
    bestFor: [
      'job portals',
      'corporate roles',
      'large companies',
      'recruiter systems',
      'users who want clarity over design',
    ],
    requiredFields: [
      { key: 'fullName', label: 'Full name', kind: 'field', paths: ['personalInfo.fullName'], severity: 'required' },
      { key: 'contact_method', label: 'At least one contact method', kind: 'contact_method', severity: 'required' },
      { key: 'experience_or_education_or_projects', label: 'Experience, education or projects', kind: 'one_of', paths: ['experience', 'education', 'projects'], severity: 'required' },
      { key: 'min_skills', label: 'At least 3 skills', kind: 'min_count', paths: ['skills'], minCount: 3, severity: 'required' },
    ],
    recommendedFields: [
      { key: 'professional_summary', label: 'Professional summary', kind: 'field', paths: ['professionalSummary'], severity: 'recommended' },
      { key: 'experience_dates', label: 'Experience start and end dates', kind: 'field', paths: ['experience.startDate', 'experience.endDate'], severity: 'recommended' },
      { key: 'certifications', label: 'Certifications', kind: 'field', paths: ['certifications'], severity: 'recommended' },
    ],
    supportedFormats: ['pdf'],
  },
  {
    key: 'reverse-chronological-professional',
    name: 'Reverse Chronological Professional',
    description:
      'Standard recruiter-friendly professional resume ordered by recent experience first.',
    category: 'professional',
    bestFor: [
      'professionals with stable work history',
      'mid-level candidates',
      'business roles',
      'operations',
      'sales',
      'marketing',
      'customer success',
      'administration',
    ],
    requiredFields: [
      { key: 'fullName', label: 'Full name', kind: 'field', paths: ['personalInfo.fullName'], severity: 'required' },
      { key: 'contact_method', label: 'At least one contact method', kind: 'contact_method', severity: 'required' },
      { key: 'experience', label: 'At least one work experience item', kind: 'min_count', paths: ['experience'], minCount: 1, severity: 'required' },
      { key: 'min_skills', label: 'At least 3 skills', kind: 'min_count', paths: ['skills'], minCount: 3, severity: 'required' },
    ],
    recommendedFields: [
      { key: 'professional_summary', label: 'Professional summary', kind: 'field', paths: ['professionalSummary'], severity: 'recommended' },
      { key: 'measurable_achievements', label: 'Measurable achievements', kind: 'field', paths: ['experience.highlights'], severity: 'recommended' },
      { key: 'experience_dates', label: 'Experience start and end dates', kind: 'field', paths: ['experience.startDate', 'experience.endDate'], severity: 'recommended' },
      { key: 'education', label: 'Education entries', kind: 'field', paths: ['education'], severity: 'recommended' },
    ],
    supportedFormats: ['pdf'],
  },
  {
    key: 'technical-projects',
    name: 'Technical Projects',
    description:
      'Technical resume for software, IT, data, engineering, DevOps, cybersecurity and related profiles.',
    category: 'technical',
    bestFor: [
      'software engineers',
      'frontend/backend developers',
      'data analysts',
      'DevOps engineers',
      'IT support',
      'cloud engineers',
      'cybersecurity profiles',
      'technical students',
    ],
    requiredFields: [
      { key: 'fullName', label: 'Full name', kind: 'field', paths: ['personalInfo.fullName'], severity: 'required' },
      { key: 'contact_method', label: 'At least one contact method', kind: 'contact_method', severity: 'required' },
      { key: 'technical_skills', label: 'Technical skills', kind: 'custom', severity: 'required' },
      { key: 'experience_or_projects', label: 'Experience or projects', kind: 'one_of', paths: ['experience', 'projects'], severity: 'required' },
    ],
    recommendedFields: [
      { key: 'github', label: 'GitHub URL', kind: 'field', paths: ['personalInfo.githubUrl'], severity: 'recommended' },
      { key: 'portfolio', label: 'Portfolio URL', kind: 'field', paths: ['personalInfo.portfolioUrl'], severity: 'recommended' },
      { key: 'project_links', label: 'Project links', kind: 'field', paths: ['projects.url', 'projects.repositoryUrl'], severity: 'recommended' },
      { key: 'technologies', label: 'Technologies per experience item', kind: 'field', paths: ['experience.technologies'], severity: 'recommended' },
      { key: 'certifications', label: 'Certifications', kind: 'field', paths: ['certifications'], severity: 'recommended' },
    ],
    supportedFormats: ['pdf'],
  },
  {
    key: 'hybrid-combination',
    name: 'Hybrid Combination',
    description:
      'Flexible format that emphasizes skills and selected achievements as much as work chronology. Great for career changers and incomplete histories.',
    category: 'hybrid',
    bestFor: [
      'career changers',
      'freelancers',
      'contractors',
      'people with gaps',
      'junior candidates with strong projects',
      'professionals moving into a new niche',
    ],
    requiredFields: [
      { key: 'fullName', label: 'Full name', kind: 'field', paths: ['personalInfo.fullName'], severity: 'required' },
      { key: 'contact_method', label: 'At least one contact method', kind: 'contact_method', severity: 'required' },
      { key: 'min_skills', label: 'At least 3 skills', kind: 'min_count', paths: ['skills'], minCount: 3, severity: 'required' },
      { key: 'experience_or_education_or_projects', label: 'Experience, education or projects', kind: 'one_of', paths: ['experience', 'education', 'projects'], severity: 'required' },
    ],
    recommendedFields: [
      { key: 'target_role', label: 'Target desired role', kind: 'field', paths: ['target.desiredRole'], severity: 'recommended' },
      { key: 'professional_summary', label: 'Professional summary', kind: 'field', paths: ['professionalSummary'], severity: 'recommended' },
      { key: 'projects', label: 'Projects', kind: 'field', paths: ['projects'], severity: 'recommended' },
      { key: 'selected_achievements', label: 'Selected achievements', kind: 'field', paths: ['experience.highlights'], severity: 'recommended' },
    ],
    supportedFormats: ['pdf'],
  },
]

export function getTemplate(key) {
  const template = CV_TEMPLATE_CATALOG.find((t) => t.key === key)
  if (!template) {
    throw new Error(`Template not found in catalog: ${key}`)
  }
  return template
}
