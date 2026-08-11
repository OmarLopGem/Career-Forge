# Flujos de datos clave

Diagramas de secuencia de los flujos más importantes. Cada uno muestra los actores externos (browser, IA, Adzuna) y los módulos internos que se atraviesan.

## Índice

1. [Login](#1-login)
2. [Generación de CV — import desde archivo](#2-import-de-cv-desde-archivo)
3. [Análisis IA de un CV](#3-análisis-ia-de-un-cv)
4. [Generación de PDF del CV](#4-generación-de-pdf)
5. [Quiz: start → submit → grading](#5-quiz-start--submit--grading)
6. [Job application: aplicar a oferta](#6-job-application-aplicar-a-oferta)
7. [Employer: publicar oferta](#7-employer-publicar-oferta)
8. [Import de ofertas desde Adzuna](#8-import-de-ofertas-desde-adzuna)

---

## 1. Login

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as app/login (RSC + Form)
    participant R as app/api/auth/login
    participant S as auth-service.js
    participant Rep as users.repository
    participant SRep as sessions.repository
    participant DB as MongoDB

    U->>P: submit { email, password }
    P->>R: POST /api/auth/login
    R->>S: serviceLogin(input)
    S->>Rep: getUserByEmail(email)
    Rep->>DB: users.findOne({ email })
    DB-->>Rep: user | null
    Rep-->>S: user
    S->>S: verifyPassword(hash, password)
    S->>SRep: createSession(userId, TTL)
    SRep->>DB: sessions.insertOne({ token, expiresAt })
    SRep-->>S: session
    S-->>R: { user, session }
    R-->>P: 200 + Set-Cookie session_token
    P-->>U: redirect /profile
```

Notas:
- Cookie es `HttpOnly`, `SameSite=Lax`. La expiración la maneja MongoDB con índice TTL sobre `sessions.expiresAt`.
- `getCurrentUserFromRequest()` (en `lib/server/auth/current-user.js`) se ejecuta en cada RSC padre para hidratar el header.

---

## 2. Import de CV desde archivo

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as CVAssistantClient
    participant R as app/api/cv/profiles/import
    participant S as cv-service.js
    participant Imp as import-cv.js
    participant Ex as extract-text-from-file
    participant P as parse-cv-file-to-profile.js
    participant AI as MiniMax
    participant N as normalize-cv-profile
    participant Repo as cv-profile.repository
    participant DB as MongoDB

    U->>W: sube PDF/DOCX
    W->>R: POST multipart
    R->>S: serviceImportCV({ buffer, mimeType, fileName })
    S->>Imp: importCVFromBuffer(input, userId)
    Imp->>Ex: extractTextFromFile(buffer, mimeType)
    Ex-->>Imp: text
    Imp->>P: parseCvFileToProfile(text)
    P->>AI: aiAnalyzeFile(buffer, mimeType, system+user)
    AI-->>P: profile JSON
    P-->>Imp: rawProfile
    Imp->>N: normalizeProfile(rawProfile, userId)
    N-->>Imp: cleanProfile
    Imp->>Repo: createProfile(cleanProfile)
    Repo->>DB: cv_profiles.insertOne
    Repo-->>Imp: savedProfile
    Imp-->>S: { profile, completion }
    S-->>R: { profile, completion }
    R-->>W: 201 + JSON
    W->>U: muestra wizard pre-llenado
```

Si el provider IA falla, el import cae a `parse-cv-text-to-profile.js` (parser sin IA) y degrada gracefully.

---

## 3. Análisis IA de un CV

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as CVAssistantClient
    participant R as app/api/cv/profiles/:id/analyze
    participant S as cv-service.js
    participant A as analyze-cv-profile.js
    participant AI as MiniMax
    participant AR as cv-analysis.repository
    participant PR as cv-profile.repository
    participant DB as MongoDB

    U->>W: click "Analyze"
    W->>R: POST
    R->>S: serviceAnalyzeProfile(profileId)
    S->>PR: getProfileById(userId, profileId)
    PR->>DB: cv_profiles.findOne
    DB-->>PR: profile
    PR-->>S: profile
    S->>A: analyzeCvProfile(profile)
    A->>AI: aiChatJSON({ system, user })
    AI-->>A: { score, suggestions, strengths, weaknesses, atsFeedback }
    A-->>S: analysisResult
    S->>AR: createAnalysisFromDraft(...)
    AR->>DB: cv_analyses.insertOne
    DB-->>AR: analysis
    AR-->>S: analysis
    S-->>R: analysis
    R-->>W: 201 + JSON
    W->>U: render dashboard de análisis
```

El campo `gradingMode` por defecto es `'ai'`. Reservado `'rule-based'` para fallback cuando no hay API key.

---

## 4. Generación de PDF

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as CVAssistantClient
    participant R as app/api/cv/profiles/:id/pdf
    participant S as cv-service.js
    participant G as generate-resume-pdf.js
    participant Tpl as template-catalog.js
    participant PR as cv-profile.repository
    participant DB as MongoDB

    U->>W: selecciona template + "Download PDF"
    W->>R: POST { templateKey }
    R->>S: serviceGeneratePdf(profileId, templateKey)
    S->>PR: getProfileById(userId, profileId)
    PR->>DB: cv_profiles.findOne
    DB-->>PR: profile
    S->>Tpl: getTemplate(templateKey)
    Tpl-->>S: template
    S->>G: generateResumePDF(profile, template)
    G-->>S: Buffer (PDF)
    S-->>R: { buffer, fileName }
    R-->>W: 200 application/pdf
    W->>U: descarga
```

El PDF se arma con `pdf-lib` (`devDependencies`). No se guarda en disco; se streamea al cliente.

---

## 5. Quiz: start → submit → grading

```mermaid
sequenceDiagram
    actor U as Usuario
    participant Q as app/quiz (UI)
    participant R1 as app/api/quiz (start)
    participant R2 as app/api/quiz/submit
    participant QS as quiz.service.js
    participant QR as quiz-question.repository
    participant AR as quiz-attempt.repository
    participant RR as quiz-result.repository
    participant AI as MiniMax (si gradingMode=ai)
    participant DB as MongoDB

    U->>Q: elige jobType + difficulty
    Q->>R1: POST
    R1->>QS: serviceStartAttempt(input)
    QS->>QR: pickQuestions(jobType, difficulty, n=20)
    QR->>DB: quiz_questions.find
    DB-->>QR: questions
    QS->>AR: createAttempt({ questionIds })
    AR->>DB: quiz_attempts.insertOne
    DB-->>AR: attempt
    AR-->>QS: attempt
    QS-->>R1: attempt (sin respuestas)
    R1-->>Q: questionsShown

    U->>Q: responde y envía
    Q->>R2: POST { attemptId, answers }
    R2->>QS: serviceSubmitAttempt(attemptId, answers)
    QS->>AR: getAttemptById(attemptId)
    AR->>DB: quiz_attempts.findOne
    DB-->>AR: attempt
    QS->>QR: getQuestionsByIds(questionIds)
    QR->>DB: quiz_questions.find
    DB-->>QR: questions

    alt gradingMode = answer-key
        QS->>QS: comparar answer key
    else gradingMode = ai
        QS->>AI: aiChatJSON({ system, user })
        AI-->>QS: grading JSON
    end

    QS->>RR: createResult(...)
    RR->>DB: quiz_results.insertOne
    RR-->>QS: result
    QS->>AR: markSubmitted(attemptId)
    AR->>DB: quiz_attempts.updateOne
    QS-->>R2: result
    R2-->>Q: result
    Q->>U: dashboard con score + feedback
```

Notas:
- El banco de preguntas está limitado a 40/rol (ver [`quiz-question.md`](../data-model/quiz-question.md)).
- Si la IA falla, `quiz.service.js` cae a answer-key grading.

---

## 6. Job application: aplicar a oferta

```mermaid
sequenceDiagram
    actor U as Usuario
    participant J as app/jobs (UI)
    participant R as app/api/job-applications
    participant JS as job-tracker.service.js
    participant JR as job-application.repository
    participant LR as job-listing.repository
    participant CR as cv-profile.repository
    participant DB as MongoDB

    U->>J: click "Apply"
    J->>R: POST { jobListingId, cvProfileId }
    R->>JS: serviceCreateApplication(input)
    JS->>LR: getJobListingById(jobListingId)
    LR->>DB: job_listings.findOne
    DB-->>LR: listing
    JS->>CR: getProfileById(userId, cvProfileId)
    CR->>DB: cv_profiles.findOne
    DB-->>CR: profile
    JS->>JS: snapshot = { job, cv }
    JS->>JR: createApplication({ ..., jobSnapshot, cvProfileSnapshot })
    JR->>DB: job_applications.insertOne
    DB-->>JR: application
    JR-->>JS: application
    JS-->>R: application
    R-->>J: 201 + JSON
    J->>U: confirma postulación
```

Notas:
- Los snapshots (`jobSnapshot`, `cvProfileSnapshot`) congelan la oferta y el CV al momento de aplicar. Si el employer edita la oferta después, el applicant sigue viendo el original.
- Cambiar status dispara side-effects: actualizar `lastActivityAt`, opcionalmente crear un `calendar_event`.

---

## 7. Employer: publicar oferta

```mermaid
sequenceDiagram
    actor E as Employer
    participant EP as app/employer/listings
    participant R as app/api/employer/listings
    participant ES as employer-listing.service.js
    participant ER as job-listing.repository
    participant Cu as current-user.js
    participant DB as MongoDB

    E->>EP: completa formulario
    EP->>R: POST { title, description, skills, ... }
    R->>Cu: requireEmployer()
    Cu->>DB: users.findOne + employers.findOne
    DB-->>Cu: { user, employer }
    Cu-->>R: { user, employer }
    R->>ES: serviceCreateListing(input, employer)
    ES->>ER: create({ ..., employerId, postedByUserId })
    ER->>DB: job_listings.insertOne
    DB-->>ER: listing
    ER-->>ES: listing
    ES-->>R: listing
    R-->>EP: 201 + JSON
    EP->>E: oferta publicada (visible si employer.status='verified')
```

Solo employers con `status='verified'` ven sus ofertas activas. `pending` y `suspended` las tienen en draft.

---

## 8. Import de ofertas desde Adzuna

```mermaid
sequenceDiagram
    actor S as Script (seed-job-listings.mjs)
    participant Adz as integrations/adzuna.js
    participant API as Adzuna API
    participant LR as job-listing.repository
    participant DB as MongoDB

    S->>Adz: searchAdzunaJobListings({ what, where, page })
    Adz->>API: GET /jobs/{country}/search/{page}
    API-->>Adz: { results: [...] }
    Adz-->>S: { jobListings, sourceMeta }
    S->>LR: upsertJobListings(jobListings)
    loop por cada listing
        LR->>DB: job_listings.updateOne({ source, externalId }, {$set}, { upsert:true })
    end
    DB-->>LR: ok
    LR-->>S: count
```

Notas:
- El índice `{ source: 1, externalId: 1 }` unique sparse garantiza dedup.
- Si `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` faltan, `isAdzunaConfigured()` retorna `false` y la UI muestra un mensaje "Import disabled".
- El seeder (`scripts/seed-job-listings.mjs`) es seguro de re-ejecutar: solo upserts.

---

## Resumen de patrones transversales

| Patrón | Dónde |
|---|---|
| Service + Repository | `lib/<feature>/server/<feature>.service.js` + `*.repository.js` |
| AI vía abstracción | `lib/services/ai.js` (`aiChat`, `aiChatJSON`, `aiAnalyzeFile`) |
| Soft delete | `deletedAt` (users, job_applications) + `isArchived` (job_applications) |
| Snapshot inmutable | `job_applications.jobSnapshot` + `cvProfileSnapshot` |
| TTL automático | `sessions.expiresAt` con índice TTL |
| Fallback answer-key | `quiz.service.js` cuando la IA falla |