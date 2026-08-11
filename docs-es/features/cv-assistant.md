# CV Assistant

El CV Assistant es la feature más rica de Career Forge: permite a un usuario crear uno o más perfiles de CV a partir de un PDF, revisar y editar la información con un wizard, recibir análisis IA con feedback ATS, elegir entre varios templates y descargar un PDF final listo para enviar.

## Vista general

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

    subgraph External[Externos]
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

## Pasos del wizard

Definidos en `lib/cv-assistant/ui-steps.js`:

| Paso | Label | Componente principal | Endpoint |
|---|---|---|---|
| 01 | Upload & Profiles | `CVUploadDropzone` + `ProfileList` | `POST /api/cv/profiles/import`, `GET /api/cv/profiles` |
| 02 | Review Profile | `PersonalInfoForm`, `ProfessionalSummaryForm`, `TargetRoleForm` | `GET/PATCH /api/cv/profiles/[profileId]` |
| 03 | AI Analysis | `AnalysisPanel` | `POST /api/cv/profiles/[profileId]/analyze`, `GET /api/cv/profiles/[profileId]/analyses` |
| 04 | Templates | `TemplateGrid` | `GET /api/cv/templates`, `POST /api/cv/templates/:key/evaluate` |
| 05 | Download | `DownloadPanel` | `POST /api/cv/profiles/[profileId]/pdf` |

## Pipeline de import (de PDF a perfil)

```mermaid
sequenceDiagram
    participant U as Usuario
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

    U->>W: arrastra PDF
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
    W->>U: muestra wizard pre-llenado
```

Puntos clave:

- **Solo PDF**: la validación rechaza otros formatos (`UNSUPPORTED_FILE_TYPE`).
- **Buffer nunca persistido**: solo se guarda el JSON estructurado en `cv_profiles`.
- **Fallback**: si la IA falla (`AIServiceError`), se cae a `parse-cv-text-to-profile.js` (parser sin IA) para evitar bloqueo total.
- **Source tracking**: el campo `source.type` se setea a `'uploaded_cv'` con `originalFileName`, `originalFileType`, `parsedAt` para auditoría.

## Pipeline de análisis IA

```mermaid
sequenceDiagram
    participant U as Usuario
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

Lo que produce el análisis:

- `overallScore` (0-100)
- `atsFeedback` — feedback estructurado para Applicant Tracking Systems
- `suggestions` — mejoras priorizadas
- `strengths` / `weaknesses`
- `gradingMode` — `'ai'` por defecto, `'rule-based'` reservado para fallback

El análisis queda persistido en `cv_analyses` con índice `{ userId, profileId, createdAt: -1 }`. El panel muestra los últimos N análisis.

## Templates de CV

`lib/cv-assistant/template-catalog.js` declara el catálogo. Cada template define `requiredFields` y `recommendedFields` que se evalúan contra el perfil.

| Key | Categoría | Caso de uso |
|---|---|---|
| `harvard-classic` | `classic` | Estudiantes, internships, business/finance/consulting. |
| `ats-simple` | `ats` | Postulaciones online, ATS corporativos, claridad sobre diseño. |
| `reverse-chronological-professional` | `professional` | Trayectoria clara, ascendente. |
| `technical-projects` | `technical` | Roles técnicos con peso en proyectos. |
| `hybrid-combination` | `hybrid` | Combina skills + experiencia. |

Evaluación: `POST /api/cv/templates/:key/evaluate` corre `evaluateTemplate(profile, template)` y devuelve:

- `status`: `'available'` | `'recommended'` | `'needs_more_information'` | `'not_recommended'`
- `missingRequired`: lista de campos faltantes
- `missingRecommended`: lista de recomendaciones

El stepper fuerza a ir al step correcto según `stepForTemplate(templateKey)`.

## Generación de PDF

```mermaid
sequenceDiagram
    participant U as Usuario
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
    DP->>U: descarga
```

Notas:
- `pdf-lib` (`devDependencies`) es la única dependencia de PDF.
- El PDF se streamea; nunca se guarda en disco del servidor.

## Modelo de datos relacionado

- [`cv_profile`](../data-model/cv-profile.md) — perfil editable con `completion.percent` recalculado en cada save.
- [`cv_analysis`](../data-model/cv-analysis.md) — análisis IA persistidos por perfil.
- Tipos compartidos en [`lib/cv-assistant/types.js`](../../lib/cv-assistant/types.js): `SeniorityLevel`, `EmploymentType`, `LanguageProficiency`, `LinkType`, `SourceType`, `AnalysisPriority`, `TemplateStatus`, `TemplateCategory`, `CVTemplateKey`.

## Auth actual

`lib/cv-assistant/server/auth/get-current-user-id.js` retorna `MOCK_USER_ID`. Esto permite desarrollar el feature end-to-end sin Firebase. Para producción, ver guía en `AGENTS.md`.

## Tests

- `app/cv-assistant/__tests__/` — tests de componentes UI (Vitest + jsdom).
- `lib/cv-assistant/test/mongo-helpers.js` — helper para tests de integración con `MongoMemoryServer`.
- `lib/cv-assistant/server/*.test.js` — tests del servicio, repos y AI mocks.

## Ver también

- [`../architecture/data-flow.md`](../architecture/data-flow.md#2-import-de-cv-desde-archivo)
- [`../architecture/data-flow.md`](../architecture/data-flow.md#3-análisis-ia-de-un-cv)
- [`../architecture/data-flow.md`](../architecture/data-flow.md#4-generación-de-pdf)