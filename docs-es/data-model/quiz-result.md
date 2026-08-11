# `quiz_results`

Resultado histórico de un quiz enviado. Cada `quiz_attempt` enviado genera exactamente un `quiz_result`.

**Colección MongoDB:** `quiz_results`
**Modelo Mongoose:** `lib/db/models/quiz-result.js`
**Función exportada:** `getQuizResultModel()`

## Estructura del documento

```json
{
  "_id": "ObjectId",
  "userId": "string ObjectId",
  "attemptId": "string ObjectId",
  "jobType": "string",
  "difficulty": "string",
  "score": "number",
  "correctCount": "number",
  "totalQuestions": "number",
  "totalMarks": "number",
  "percentage": "number (0-100)",
  "passed": "boolean",
  "gradingMode": "'answer-key' | 'ai' (default 'answer-key')",
  "feedback": "string",
  "completedAt": "string ISO-8601",
  "createdAt": "string ISO-8601"
}
```

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string | Quién completó. |
| `attemptId` | string | FK a `quiz_attempts._id`. |
| `jobType` / `difficulty` | string | Snapshot (no se re-deriva del attempt). |
| `score` | number | Suma de marks de preguntas correctas. |
| `correctCount` | number | Cantidad de aciertos. |
| `totalQuestions` | number | Cantidad total respondidas. |
| `totalMarks` | number | Suma de marks posibles. |
| `percentage` | number | `score / totalMarks * 100`. |
| `passed` | boolean | `percentage >= 60` (configurable). |
| `gradingMode` | string | `answer-key` (local) o `ai` (cuando se usa IA para validar respuestas abiertas). |
| `feedback` | string | Resumen humano-legible. |

## Índices

- `{ userId: 1, completedAt: -1 }` (`quiz_results_user_completed`).
- `{ userId: 1, jobType: 1, completedAt: -1 }` (`quiz_results_user_job_type_completed`).

## Modos de grading

1. **answer-key** (default, más rápido): compara la respuesta del usuario contra `quiz_questions.answer`. Funciona offline.
2. **ai**: cuando hay preguntas abiertas, delega al modelo IA. Si el provider falla, hace fallback a answer-key.

## Relaciones

- **N:1 → `users`**.
- **1:1 → `quiz_attempts`**.

## Ver también

- [`quiz-question.md`](quiz-question.md)
- [`quiz-attempt.md`](quiz-attempt.md)