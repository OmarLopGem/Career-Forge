import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AI_BANK_LIMIT_PER_ROLE,
  DEFAULT_AI_BANK_LIMIT_TOTAL,
  DEFAULT_AI_SEED_TARGET_PER_ROLE,
  DEFAULT_AI_SEED_TOTAL,
  JOB_ROLES,
} from './job-role-catalog.js'

describe('job role catalog', () => {
  it('covers the requested office, representative, and mechanic roles', () => {
    expect(JOB_ROLES).toEqual(expect.arrayContaining([
      'Front Desk Representative',
      'Customer Service Representative',
      'Sales Representative',
      'Automotive Mechanic',
      'Industrial Mechanic',
    ]))
  })

  it('targets a controlled 1,000 to 2,000 question library', () => {
    expect(JOB_ROLES).toHaveLength(48)
    expect(DEFAULT_AI_SEED_TARGET_PER_ROLE).toBe(30)
    expect(DEFAULT_AI_SEED_TOTAL).toBe(1440)
    expect(DEFAULT_AI_BANK_LIMIT_PER_ROLE).toBe(40)
    expect(DEFAULT_AI_BANK_LIMIT_TOTAL).toBe(1920)
  })
})
