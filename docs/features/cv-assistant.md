# CV Assistant

The CV Assistant is the richest feature of Career Forge: it lets a user create one or more CV profiles from a PDF, review and edit the information through a wizard, receive AI analysis with ATS feedback, pick among several templates, and download a ready-to-send PDF.

## Overview

```mermaid
flowchart LR
    subgraph Client[app/cv-assistant - Client]
        Stepper[CVAssistantStepper]
        Upload[CVUploadDropzone]
        Forms[PersonalInfoForm<br/>ProfessionalSummaryForm<br/>TargetRoleForm]
        ProfileList[ProfileList]
        Completion[ProfileCompletionCard]
        Analysis[AnalysisPanel]
        Templates[TemplateGrid]
        Download[DownloadPanel]
    end

    subgraph Server[lib/cv-assistant/server]
        CvSvc[cv-service.js]
        Repos[cv-profile.repository<br/>cv-analysis.repository]
        AI[ai/analyze-cv-profile<br/>ai/parse-cv-file-to-profile]
        Import[import-cv.js]
        PDF[generate-resume-pdf.js]
        Tpl[template-catalog.js]
        Norm[normalize-cv-profile]
    end

    subgraph External[External]
        DB[(MongoDB)]
        LLM[MiniMax]
    end

    Stepper --> Upload
    Stepper --> Forms
    Stepper --> ProfileList
    Stepper --> Completion
    Stepper --> Analysis
    Stepper --> Templates
    Stepper --> Download

    Upload -->|/api/cv/profiles/import| CvSvc
    Forms -->|/api/cv/profiles/:id| CvSvc
    ProfileList -->|/api/cv/profiles| CvSvc
    Analysis -->|/api/cv/profiles/:id/analyze| CvSvc
    Templates -->|/api/cv/templates| CvSvc
    Download -->|/api/cv/profiles/:id/pdf| CvSvc

    CvSvc --> Repos
    CvSvc --> Import
    CvSvc --> AI
    CvSvc --> PDF
    CvSvc --> Tpl

    Repos --> DB
    AI --> LLM
    Import --> LLM
```

## Wizard steps

Defined in `lib/cv-assistant/ui-steps.js`:

| Step | Label | Main component | Endpoint |
|---|---|---|---|
| 01 | Upload & Profiles | `CVUploadDropzone` + `ProfileList` | `POST /api/cv/profiles/import`, `GET /api/cv/profiles` |
| 02 | Review Profile | `PersonalInfoForm`, `ProfessionalSummaryForm`, `TargetRoleForm` | `GET/PATCH /api/cv/profiles/:profileId` |
| 03 | AI Analysis | `AnalysisPanel` | `POST /api/cv/profiles/:profileId/analyze`, `GET /api/cv/profiles/:profileId/analyses` |
| 04 | Templates | `TemplateGrid` | `GET /api/cv/templates`, `POST /api/cv/templates/:key/evaluate` |
| 05 | Download | `DownloadPanel` | `POST /api/cv/profiles/:profileId/pdf` |

## Import pipeline (PDF → profile)

```mermaid
sequenceDiagram
    participant U as User
    participant W as CVUploadDropzone
    participant API as /api/cv/profiles/import
    participant Svc as cv-service.serviceImportCV
    participant Imp as import-cv
    participant Ex as extract-text-from-file
    participant AI as parse-cv-file-to-profile
    participant LLM as MiniMax
    participant N as normalize-cv-profile
    participant Repo as cv-profile.repository
    participant DB as MongoDB

    U->>W: drag PDF
    W->>W: validateUpload(size, mime)
    W->>API: POST multipart
    API->>Svc: serviceImportCV({ buffer, mimeType, fileName, title })
    Svc->>Imp: importCVFromBuffer(input, userId)
    Imp->>Ex: extractTextFromFile(buffer, mimeType)
    Ex-->>Imp: extracted text (PDF)
    Imp->>AI: parseCVFileToProfile(buffer, mimeType, ...)
    AI->>LLM: aiAnalyzeFile(buffer, mimeType, system+user)
    LLM-->>AI: profile JSON
    AI-->>Imp: rawProfile
    Imp->>N: normalizeProfile(rawProfile, userId, source)
    N-->>Imp: cleanProfile
    Imp->>Repo: createProfile(cleanProfile)
    Repo->>DB: cv_profiles.insertOne
    DB-->>Repo: profile
    Repo-->>Svc: profile
    Svc-->>API: { profile, completion }
    API-->>W: 201 JSON
    W->>U: shows pre-filled wizard
```

Key points:

- **PDF only**: validation rejects other formats (`UNSUPPORTED_FILE_TYPE`).
- **Buffer is never persisted**: only the structured JSON is saved in `cv_profiles`.
- **Fallback**: if AI fails (`AIServiceError`), it falls back to `parse-cv-text-to-profile.js` (parser without AI) to avoid total blockage.
- **Source tracking**: the `source.type` field is set to `'uploaded_cv'` with `originalFileName`, `originalFileType`, `parsedAt` for audit.

## AI analysis pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant P as AnalysisPanel
    participant API as POST /api/cv/profiles/:id/analyze
    participant Svc as cv-service.serviceAnalyzeProfile
    participant AI as analyze-cv-profile
    participant LLM as MiniMax
    participant AR as cv-analysis.repository
    participant DB as MongoDB

    U->>P: click "Analyze"
    P->>API: POST
    API->>Svc: serviceAnalyzeProfile(profileId)
    Svc->>DB: cv_profiles.findOne(userId, profileId)
    DB-->>Svc: profile
    Svc->>AI: analyzeCvProfile(profile)
    AI->>LLM: aiChatJSON({ system, user, temperature: 0.3 })
    LLM-->>AI: { score, suggestions, strengths, weaknesses, atsFeedback }
    AI-->>Svc: analysisResult
    Svc->>AR: createAnalysisFromDraft(userId, profileId, result)
    AR->>DB: cv_analyses.insertOne
    DB-->>AR: analysis
    AR-->>Svc: analysis
    Svc-->>API: analysis
    API-->>P: 201 JSON
    P->>U: dashboard
```

What the analysis produces:

- `overallScore` (0-100)
- `atsFeedback` — structured feedback for Applicant Tracking Systems
- `suggestions` — prioritised improvements
- `strengths` / `weaknesses`
- `gradingMode` — `'ai'` by default, `'rule-based'` reserved as fallback

The analysis is persisted in `cv_analyses` with the index `{ userId, profileId, createdAt: -1 }`. The panel shows the latest N analyses.

## CV templates

`lib/cv-assistant/template-catalog.js` declares the catalogue. Every template defines `requiredFields` and `recommendedFields` that are evaluated against the profile.

| Key | Category | Use case |
|---|---|---|
| `harvard-classic` | `classic` | Students, internships, business/finance/consulting. |
| `ats-simple` | `ats` | Online applications, corporate ATS, clarity over design. |
| `reverse-chronological-professional` | `professional` | Clear, ascending trajectory. |
| `technical-projects` | `technical` | Technical roles with weight on projects. |
| `hybrid-combination` | `hybrid` | Combines skills + experience. |

Evaluation: `POST /api/cv/templates/:key/evaluate` runs `evaluateTemplate(profile, template)` and returns:

- `status`: `'available'` | `'recommended'` | `'needs_more_information'` | `'not_recommended'`
- `missingRequired`: list of missing required fields
- `missingRecommended`: list of recommendations

The stepper forces moving to the correct step according to `stepForTemplate(templateKey)`.

## PDF generation

```mermaid
sequenceDiagram
    participant U as User
    participant DP as DownloadPanel
    participant API as POST /api/cv/profiles/:id/pdf
    participant Svc as cv-service.serviceGeneratePdf
    participant PR as cv-profile.repository
    participant Tpl as template-catalog
    participant G as generate-resume-pdf
    participant Lib as pdf-lib

    U->>DP: click "Download"
    DP->>API: POST { templateKey }
    API->>Svc: serviceGeneratePdf(profileId, templateKey)
    Svc->>PR: getProfileById(userId, profileId)
    PR-->>Svc: profile
    Svc->>Tpl: getTemplate(templateKey)
    Tpl-->>Svc: template
    Svc->>G: generateResumePDF(profile, template)
    G->>Lib: PDFDocument.create + drawText
    Lib-->>G: bytes
    G-->>Svc: Buffer
    Svc-->>API: { buffer, fileName }
    API-->>DP: 200 application/pdf
    DP->>U: downloads
```

Notes:
- `pdf-lib` (`devDependencies`) is the only PDF dependency.
- The PDF is streamed; never written to server disk.

## Related data model

- [`cv_profile`](../data-model/cv-profile.md) — editable profile with `completion.percent` recalculated on each save.
- [`cv_analysis`](../data-model/cv-analysis.md) — AI analyses persisted per profile.
- Shared types in [`lib/cv-assistant/types.js`](../../lib/cv-assistant/types.js): `SeniorityLevel`, `EmploymentType`, `LanguageProficiency`, `LinkType`, `SourceType`, `AnalysisPriority`, `TemplateStatus`, `TemplateCategory`, `CVTemplateKey`.

## Current auth

`lib/cv-assistant/server/auth/get-current-user-id.js` returns `MOCK_USER_ID`. This enables developing the feature end-to-end without Firebase. For production, see the guide in `AGENTS.md`.

## Tests

- `app/cv-assistant/__tests__/` — UI component tests (Vitest + jsdom).
- `lib/cv-assistant/test/mongo-helpers.js` — helper for integration tests with `MongoMemoryServer`.
- `lib/cv-assistant/server/*.test.js` — service, repo and AI mock tests.

## See also

- [`../architecture/data-flow.md`](../architecture/data-flow.md#2-cv-import-from-file)
- [`../architecture/data-flow.md`](../architecture/data-flow.md#3-ai-analysis-of-a-cv)
- [`../architecture/data-flow.md`](../architecture/data-flow.md#4-cv-pdf-generation)