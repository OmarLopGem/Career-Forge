import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  serviceAnalyzeProfile,
  serviceDeleteProfile,
  serviceGenerateResume,
  serviceGetLatestAnalysis,
  serviceGetProfile,
  serviceGetTemplateCatalog,
  serviceImportCV,
  serviceListProfiles,
  serviceListTemplates,
  serviceSetDefaultProfile,
  serviceUpdateProfile,
  toApiErrorResponse,
} from './cv-service.js'
import { startMongo, stopMongo, clearMongo } from '../test/mongo-helpers.js'

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
})

function makeBuffer() {
  return new Uint8Array([1, 2, 3, 4, 5])
}

describe('cv-service', () => {
  it('importCV rejects unsupported file types', async () => {
    try {
      await serviceImportCV({
        fileName: 'cv.txt',
        mimeType: 'text/plain',
        buffer: makeBuffer(),
      })
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('UNSUPPORTED_FILE_TYPE')
    }
  })

  it('importCV rejects too-large files', async () => {
    try {
      await serviceImportCV({
        fileName: 'cv.pdf',
        mimeType: 'application/pdf',
        buffer: new Uint8Array(6 * 1024 * 1024),
      })
      throw new Error('expected error')
    } catch (err) {
      const { body } = toApiErrorResponse(err)
      expect(body.error.code).toBe('FILE_TOO_LARGE')
    }
  })

  it('importCV creates a profile with deterministic mock parsing', async () => {
    const result = await serviceImportCV({
      fileName: 'cv.pdf',
      mimeType: 'application/pdf',
      buffer: makeBuffer(),
      title: 'Imported CV',
    })
    expect(result.profile).toBeDefined()
    expect(result.profile._id).toBeDefined()
    expect(result.profile.title).toBe('Imported CV')
    expect(result.profile.source.originalFileName).toBe('cv.pdf')
  })

  it('listProfiles is scoped to mock user', async () => {
    await serviceImportCV({ fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer() })
    const list = await serviceListProfiles()
    expect(list).toHaveLength(1)
  })

  it('getProfile validates ownership and throws 404 for another user id (mocked)', async () => {
    const created = await serviceImportCV({
      fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
    })
    const got = await serviceGetProfile(created.profile._id)
    expect(got._id).toBe(created.profile._id)
    try {
      await serviceGetProfile('not-a-real-id')
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(404)
      expect(body.error.code).toBe('PROFILE_NOT_FOUND')
    }
  })

  it('updateProfile returns updated profile with refreshed completion', async () => {
    const created = await serviceImportCV({
      fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
    })
    const updated = await serviceUpdateProfile(created.profile._id, { title: 'New title' })
    expect(updated.profile.title).toBe('New title')
    expect(updated.completion).toBeDefined()
  })

  it('analyzeProfile creates a new analysis', async () => {
    const created = await serviceImportCV({
      fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
    })
    const { analysis, profile } = await serviceAnalyzeProfile(created.profile._id)
    expect(analysis._id).toBeDefined()
    expect(analysis.detectedNiche).toBeTruthy()
    expect(profile).toBeDefined()
  })

  it('getLatestAnalysis returns latest', async () => {
    const created = await serviceImportCV({
      fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
    })
    await serviceAnalyzeProfile(created.profile._id)
    const { analysis } = await serviceGetLatestAnalysis(created.profile._id)
    expect(analysis).not.toBeNull()
  })

  it('listTemplates returns five templates with evaluations', async () => {
    const created = await serviceImportCV({
      fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
    })
    const { templates } = await serviceListTemplates(created.profile._id)
    expect(templates).toHaveLength(5)
  })

  it('generate blocks incomplete profile', async () => {
    try {
      const created = await serviceImportCV({
        fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
      })
      await serviceUpdateProfile(created.profile._id, {
        personalInfo: { fullName: '' },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      })
      await serviceGenerateResume(created.profile._id, 'ats-simple')
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(['PROFILE_INCOMPLETE', 'TEMPLATE_REQUIREMENTS_NOT_MET']).toContain(body.error.code)
    }
  })

  it('generate returns a PDF buffer for valid profile/template', async () => {
    const created = await serviceImportCV({
      fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
    })
    const result = await serviceGenerateResume(created.profile._id, 'ats-simple')
    expect(String.fromCharCode(...result.pdfBytes.subarray(0, 4))).toBe('%PDF')
    expect(result.fileName).toContain('ats-simple')
  })

  it('deleteProfile removes profile', async () => {
    const created = await serviceImportCV({
      fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
    })
    await serviceDeleteProfile(created.profile._id)
    const list = await serviceListProfiles()
    expect(list).toHaveLength(0)
  })

  it('setDefaultProfile marks the profile as default', async () => {
    const created = await serviceImportCV({
      fileName: 'cv.pdf', mimeType: 'application/pdf', buffer: makeBuffer(),
    })
    await serviceSetDefaultProfile(created.profile._id)
    const got = await serviceGetProfile(created.profile._id)
    expect(got.isDefault).toBe(true)
  })

  it('getTemplateCatalog returns all five templates', () => {
    const { templates } = serviceGetTemplateCatalog()
    expect(templates).toHaveLength(5)
    expect(templates.map((t) => t.key).sort()).toEqual([
      'ats-simple',
      'harvard-classic',
      'hybrid-combination',
      'reverse-chronological-professional',
      'technical-projects',
    ])
  })
})
