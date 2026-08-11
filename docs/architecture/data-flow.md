# Key data flows

Sequence diagrams for the most important flows. Each one shows external actors (browser, AI, Adzuna) and the internal modules crossed.

## Index

1. [Login](#1-login)
2. [CV generation — import from file](#2-cv-import-from-file)
3. [AI analysis of a CV](#3-ai-analysis-of-a-cv)
4. [CV PDF generation](#4-cv-pdf-generation)
5. [Quiz: start → submit → grading](#5-quiz-start--submit--grading)
6. [Job application: apply to posting](#6-job-application-apply-to-posting)
7. [Employer: publish posting](#7-employer-publish-posting)
8. [Import postings from Adzuna](#8-import-postings-from-adzuna)

---

## 1. Login

```mermaid
sequenceDiagram
    actor U as User
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

Notes:
- Cookie is `HttpOnly`, `SameSite=Lax`. Expiration is handled by MongoDB with a TTL index on `sessions.expiresAt`.
- `getCurrentUserFromRequest()` (in `lib/server/auth/current-user.js`) runs in every parent RSC to hydrate the header.

---

## 2. CV import from file

```mermaid
sequenceDiagram
    actor U as User
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

    U->>W: upload PDF/DOCX
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
    W->>U: shows pre-filled wizard
```

If the AI provider fails, the import falls back to `parse-cv-text-to-profile.js` (parser without AI) and degrades gracefully.

---

## 3. AI analysis of a CV

```mermaid
sequenceDiagram
    actor U as User
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
    W->>U: renders analysis dashboard
```

The `gradingMode` field defaults to `'ai'`. `'rule-based'` is reserved as a fallback when no API key is available.

---

## 4. CV PDF generation

```mermaid
sequenceDiagram
    actor U as User
    participant W as CVAssistantClient
    participant R as app/api/cv/profiles/:id/pdf
    participant S as cv-service.js
    participant G as generate-resume-pdf.js
    participant Tpl as template-catalog.js
    participant PR as cv-profile.repository
    participant DB as MongoDB

    U->>W: select template + "Download PDF"
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
    W->>U: downloads
```

The PDF is assembled with `pdf-lib` (`devDependencies`). Not stored on disk; streamed to the client.

---

## 5. Quiz: start → submit → grading

```mermaid
sequenceDiagram
    actor U as User
    participant Q as app/quiz (UI)
    participant R1 as app/api/quiz (start)
    participant R2 as app/api/quiz/submit
    participant QS as quiz.service.js
    participant QR as quiz-question.repository
    participant AR as quiz-attempt.repository
    participant RR as quiz-result.repository
    participant AI as MiniMax (if gradingMode=ai)
    participant DB as MongoDB

    U->>Q: pick jobType + difficulty
    Q->>R1: POST
    R1->>QS: serviceStartAttempt(input)
    QS->>QR: pickQuestions(jobType, difficulty, n=20)
    QR->>DB: quiz_questions.find
    DB-->>QR: questions
    QS->>AR: createAttempt({ questionIds })
    AR->>DB: quiz_attempts.insertOne
    DB-->>AR: attempt
    AR-->>QS: attempt
    QS-->>R1: attempt (without answers)
    R1-->>Q: questionsShown

    U->>Q: answer and submit
    Q->>R2: POST { attemptId, answers }
    R2->>QS: serviceSubmitAttempt(attemptId, answers)
    QS->>AR: getAttemptById(attemptId)
    AR->>DB: quiz_attempts.findOne
    DB-->>AR: attempt
    QS->>QR: getQuestionsByIds(questionIds)
    QR->>DB: quiz_questions.find
    DB-->>QR: questions

    alt gradingMode = answer-key
        QS->>QS: compare against answer key
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
    Q->>U: dashboard with score + feedback
```

Notes:
- The question bank is capped at 40/role (see [`quiz-question.md`](../data-model/quiz-question.md)).
- If the AI fails, `quiz.service.js` falls back to answer-key grading.

---

## 6. Job application: apply to posting

```mermaid
sequenceDiagram
    actor U as User
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
    J->>U: application confirmed
```

Notes:
- The snapshots (`jobSnapshot`, `cvProfileSnapshot`) freeze the posting and the CV at the moment of application. If the employer edits the posting afterwards, the applicant still sees the original.
- Status changes drive side-effects: updating `lastActivityAt`, optionally creating a `calendar_event`.

---

## 7. Employer: publish posting

```mermaid
sequenceDiagram
    actor E as Employer
    participant EP as app/employer/listings
    participant R as app/api/employer/listings
    participant ES as employer-listing.service.js
    participant ER as job-listing.repository
    participant Cu as current-user.js
    participant DB as MongoDB

    E->>EP: complete form
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
    EP->>E: posting published (visible if employer.status='verified')
```

Only employers with `status='verified'` see their postings as active. `pending` and `suspended` keep them in draft.

---

## 8. Import postings from Adzuna

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
    loop per listing
        LR->>DB: job_listings.updateOne({ source, externalId }, {$set}, { upsert:true })
    end
    DB-->>LR: ok
    LR-->>S: count
```

Notes:
- The unique sparse index `{ source: 1, externalId: 1 }` guarantees dedup.
- If `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` are missing, `isAdzunaConfigured()` returns `false` and the UI shows "Import disabled".
- The seeder (`scripts/seed-job-listings.mjs`) is safe to re-run: only upserts.

---

## Cross-cutting patterns summary

| Pattern | Where |
|---|---|
| Service + Repository | `lib/<feature>/server/<feature>.service.js` + `*.repository.js` |
| AI via abstraction | `lib/services/ai.js` (`aiChat`, `aiChatJSON`, `aiAnalyzeFile`) |
| Soft delete | `deletedAt` (users, job_applications) + `isArchived` (job_applications) |
| Immutable snapshot | `job_applications.jobSnapshot` + `cvProfileSnapshot` |
| Automatic TTL | `sessions.expiresAt` with TTL index |
| Answer-key fallback | `quiz.service.js` when AI fails |