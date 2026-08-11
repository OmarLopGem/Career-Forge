# Quiz

El módulo Quiz es el motor de orientación de Career Forge. Ayuda a los usuarios a descubrir qué roles les quedan mejor a través de intentos cortos de preguntas específicas por rol, con dificultad escalonada. Los admins curan el banco de preguntas; la IA puede completarlo on-demand cuando el catálogo queda corto.

## Vista general

```mermaid
flowchart LR
    subgraph UserSide[Lado usuario - app/quiz]
        QuizUI[QuizClient<br/>selector de rol, preguntas, resultados]
        ResultsUI[Historial de resultados]
    end

    subgraph Server[lib/server/quiz + lib/server/progress]
        Svc[quiz.service.js]
        AISvc[quiz-ai.service.js]
        StreakSvc[quiz-streak.service.js]
        QRepo[quiz-question.repository]
        ARepo[quiz-attempt.repository]
        RRepo[quiz-result.repository]
    end

    subgraph Admin[Lado admin - app/admin/quiz]
        AdminUI[Panel admin de quiz]
    end

    subgraph External
        DB[(MongoDB)]
        LLM[MiniMax]
    end

    QuizUI -->|GET /api/quiz| Svc
    QuizUI -->|POST /api/quiz/submit| Svc
    ResultsUI -->|GET /api/quiz/results| Svc
    ResultsUI -->|GET /api/quiz/streak| StreakSvc

    AdminUI -->|GET /api/admin/quiz| Svc
    AdminUI -->|POST /api/admin/quiz/generate| Svc

    Svc --> QRepo
    Svc --> ARepo
    Svc --> RRepo
    Svc --> AISvc

    AISvc -->|aiChatJSON| LLM
    QRepo --> DB
    ARepo --> DB
    RRepo --> DB
```

## Roles y dificultades

- **48 roles** soportados (ver `lib/quiz/job-role-catalog.js`).
- **3 dificultades**: `Beginner`, `Intermediate`, `Advanced`.
- **10 preguntas por quiz** (`QUESTIONS_PER_QUIZ` en `quiz.service.js`).
- **Puntaje de aprobación**: 70% (`passed = percentage >= 70`).

La siguiente dificultad del usuario se calcula a partir de su historial de aprobaciones para ese `jobType`:

```js
// lib/server/quiz/quiz.service.js
if (passedDifficulties.has('Advanced') || passedDifficulties.has('Intermediate')) return 'Advanced'
if (passedDifficulties.has('Beginner')) return 'Intermediate'
return 'Beginner'
```

Si aprueba el nivel actual **y** hay al menos 10 preguntas disponibles para el siguiente, avanza automáticamente.

## Banco de preguntas

Cada pregunta pertenece a un `jobType` y una `difficulty`. El origen es `manual` (sembrada) o `ai` (generada).

Controles del banco (forzados por el seeder `npm run seed:quiz:ai` y por el generador en runtime):

- **Target por rol**: 30 preguntas Beginner.
- **Tope absoluto por rol**: 40 preguntas Beginner.
- **Target de catálogo**: 1.440 preguntas Beginner (48 × 30).
- **Tope de catálogo**: 1.920 preguntas Beginner (48 × 40).

Índices (`lib/db/models/quiz-question.js`):

- `{ jobType: 1 }` — filtro por rol.
- `{ jobType: 1, question: 1 }` unique — dedup por texto por rol.

Ver [`../data-model/quiz-question.md`](../data-model/quiz-question.md) para el esquema completo.

## Iniciar un quiz

`GET /api/quiz?jobType=<rol>` ejecuta `serviceListQuizQuestions(jobType)`. El flujo:

```mermaid
sequenceDiagram
    actor U as Usuario
    participant API as GET /api/quiz
    participant Svc as quiz.service
    participant Auth as current-user
    participant QRepo as quiz-question.repository
    participant ARepo as quiz-attempt.repository
    participant AI as quiz-ai.service
    participant LLM as MiniMax
    participant DB as MongoDB

    U->>API: GET ?jobType=Software%20Engineer
    API->>Svc: serviceListQuizQuestions(jobType)
    Svc->>Auth: requireCurrentUser()
    Svc->>QRepo: listQuizQuestions(jobType)
    QRepo->>DB: quiz_questions.find({ jobType })
    DB-->>QRepo: stored questions
    Svc->>Svc: getCurrentQuizDifficulty(history)
    Svc->>ARepo: findActiveQuizAttempt(user, jobType, difficulty)
    alt hay intento activo
        ARepo-->>Svc: existing attempt
        Svc-->>API: reuse attempt + questions
    else sin intento activo
        opt Beginner + IA configurada + faltan preguntas
            Svc->>AI: generateQuizQuestionDrafts({ count })
            AI->>LLM: aiChatJSON
            LLM-->>AI: drafts
            AI->>QRepo: saveGeneratedQuizQuestions (upsert)
        end
        Svc->>Svc: selectQuestionsForDifficulty (10 random)
        Svc->>ARepo: createQuizAttempt
        ARepo->>DB: quiz_attempts.insertOne
        Svc-->>API: { attemptId, questions, difficulty, generationMode, bankCount, aiWarning? }
    end
```

Puntos clave:

- La respuesta **nunca incluye las respuestas correctas** (`toPublicQuestions` quita `answer`).
- Si el usuario ya tiene un intento activo, se reutiliza (carga idempotente).
- En `Beginner`, si hay menos de 10 preguntas, la IA puede completar hasta el tope (40 por rol).
- Si la generación IA falla, el usuario recibe el quiz con las preguntas almacenadas disponibles; se devuelve un string `aiWarning`.

## Enviar un quiz

`POST /api/quiz/submit { attemptId, answers }` ejecuta `serviceSubmitQuiz(input)`.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant API as POST /api/quiz/submit
    participant Svc as quiz.service
    participant ARepo as quiz-attempt.repository
    participant QRepo as quiz-question.repository
    participant AI as quiz-ai.service (si Beginner)
    participant LLM as MiniMax
    participant RRepo as quiz-result.repository
    participant DB as MongoDB

    U->>API: { attemptId, answers }
    API->>Svc: serviceSubmitQuiz(input)
    Svc->>ARepo: getQuizAttemptForUser(attemptId, user._id)
    ARepo->>DB: quiz_attempts.findOne({ _id, userId })
    DB-->>ARepo: attempt | null
    Svc->>QRepo: listQuizQuestionsByIds(attempt.questionIds)
    QRepo->>DB: quiz_questions.find({ _id: { $in } })
    DB-->>QRepo: questions
    alt difficulty == Beginner
        Svc->>AI: gradeBeginnerQuizAnswers({ questions, answers })
        AI->>LLM: aiChatJSON
        LLM-->>AI: { per-question correct + feedback }
        AI-->>Svc: { mode: 'ai', results }
    else otras dificultades
        Svc->>Svc: exactAnswerResults (compara con answer key)
    end
    Svc->>Svc: calcula score, percentage, passed
    Svc->>RRepo: createQuizResult(...)
    RRepo->>DB: quiz_results.insertOne
    DB-->>RRepo: result
    opt passed AND attempt existe
        Svc->>ARepo: completeQuizAttempt(attemptId, user._id)
        ARepo->>DB: quiz_attempts.updateOne({ status: 'submitted' })
    end
    Svc-->>API: { result, correctCount, totalQuestions, score, percentage, passed, nextDifficulty, questionResults }
```

Reglas de scoring:

- Score = `sum(marks de preguntas correctas)`.
- Percentage = `score / totalMarks * 100`.
- `passed` si percentage ≥ 70.
- `gradingMode` es `'ai'` para Beginner (cuando el grading IA funciona) y `'answer-key'` en caso contrario.
- `feedback` es un mensaje corto basado en buckets de percentage.

Si el usuario aprobó el nivel actual y el siguiente nivel tiene 10+ preguntas, `nextDifficulty` avanza.

## Modos de grading

| Dificultad | Grading | Por qué |
|---|---|---|
| Beginner | IA (`gradeBeginnerQuizAnswers`) | Permite preguntas cortas y fill-in-the-blank que requieren juicio semántico. |
| Intermediate / Advanced | Answer-key (`exactAnswerResults`) | Más rápido, offline-capable, determinista para MCQ. |

Si el provider IA no está disponible en Beginner, el servicio **cae a answer-key** para nunca bloquear al usuario.

## Streak

`GET /api/quiz/streak` ejecuta `serviceGetQuizStreak()` (`lib/server/progress/quiz-streak.service.js`).

Dos rachas se calculan a partir de `quiz_results.completedAt`:

- **`currentStreak`** — días UTC consecutivos terminando hoy (o ayer). Si el usuario no jugó hoy ni ayer, la racha es 0.
- **`longestStreak`** — la corrida consecutiva más larga de días UTC en el historial del usuario.

```mermaid
sequenceDiagram
    participant API as GET /api/quiz/streak
    participant Svc as quiz-streak.service
    participant Auth as current-user
    participant RRepo as quiz-result.repository
    participant DB as MongoDB

    API->>Svc: serviceGetQuizStreak()
    Svc->>Auth: requireCurrentUser()
    Svc->>RRepo: listQuizResultsByUser(user._id)
    RRepo->>DB: quiz_results.find({ userId })
    DB-->>RRepo: results
    Svc->>Svc: collectUniqueDayKeys(results)
    Svc->>Svc: computeCurrentStreak / computeLongestStreak
    Svc-->>API: { currentStreak, longestStreak, lastCompletedAt }
```

## Pipeline de generación IA (admin / on-demand)

`POST /api/admin/quiz/generate` ejecuta `serviceGenerateQuizQuestions(input)` → `generateQuizQuestionDrafts` → `saveGeneratedQuizQuestions`.

```mermaid
sequenceDiagram
    actor A as Admin (o hook runtime)
    participant API as POST /api/admin/quiz/generate
    participant Svc as quiz-ai.service
    participant LLM as MiniMax
    participant QRepo as quiz-question.repository
    participant DB as MongoDB

    A->>API: { jobType, topic, difficulty, type, count, avoidQuestions }
    API->>Svc: generateQuizQuestionDrafts(input)
    Svc->>LLM: aiChatJSON({ system, user, responseFormat: 'json_object' })
    LLM-->>Svc: drafts (mcq + blank)
    Svc->>Svc: validateQuizQuestionInput por draft
    Svc->>QRepo: saveGeneratedQuizQuestions(drafts)
    QRepo->>DB: bulkWrite upserts (jobType, question unique)
    DB-->>QRepo: docs
    QRepo-->>Svc: saved questions
    Svc-->>API: { drafts, saved }
```

El system prompt fuerza un shape JSON estricto (`{ questions: [...] }`), MCQs con una sola respuesta correcta, y redacción sin sesgos. `avoidQuestions` permite pasar texto de preguntas existentes para que el generador no repita.

El bulk upsert usa `filter: { jobType, question }` para que el mismo texto en el mismo rol **nunca se duplique**.

## Endpoints de admin

| Endpoint | Método | Propósito |
|---|---|---|
| `/api/admin/quiz` | GET | Listar todas las preguntas del banco. |
| `/api/admin/quiz/generate` | POST | Generar nuevas preguntas vía IA y upsert. |

Todos los endpoints admin de quiz requieren `requireAdminUser()`.

## Modelo de datos relacionado

- [`quiz_questions`](../data-model/quiz-question.md) — banco.
- [`quiz_attempts`](../data-model/quiz-attempt.md) — intentos activos.
- [`quiz_results`](../data-model/quiz-result.md) — resultados históricos.

## Ver también

- [`../architecture/data-flow.md`](../architecture/data-flow.md#5-quiz-start--submit--grading) — el sequence principal.
- `lib/quiz/job-role-catalog.js` — el catálogo de 48 roles.
- `scripts/seed-quiz-ai.mjs` — seeder IA bulk.