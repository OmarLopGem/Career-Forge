# `quiz_questions`

Banco de preguntas para el quiz de orientación. Cada pregunta está asociada a un `jobType` (rol laboral) y un `difficulty` (Beginner / Intermediate / Advanced).

**Colección MongoDB:** `quiz_questions`
**Modelo Mongoose:** `lib/db/models/quiz-question.js`
**Función exportada:** `getQuizQuestionModel()`

## Estructura del documento

```json
{
  "_id": "ObjectId",
  "jobType": "string",
  "type": "'multiple_choice' | 'true_false' | 'short_answer'",
  "difficulty": "'Beginner' | 'Intermediate' | 'Advanced'",
  "source": "'manual' | 'ai' (default 'manual')",
  "question": "string",
  "options": "string[] | { correct: string, distractors: string[] }",
  "answer": "string | string[]",
  "marks": "number",
  "createdAt": "string ISO-8601",
  "updatedAt": "string ISO-8601"
}
```

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `jobType` | string | Identificador del rol (ej. `'Software Engineer'`, `'Nurse'`). Se usa para filtrar el banco. |
| `type` | string | Tipo de pregunta. Hoy solo se usa `multiple_choice` end-to-end. |
| `difficulty` | string | Nivel. Define pool y scoring. |
| `source` | string | `'manual'` (seed inicial) o `'ai'` (generado por seeder IA). |
| `question` | string | Enunciado. Único por `jobType` (índice unique). |
| `options` | mixed | Array de strings (vista al usuario) o estructura `{ correct, distractors }`. |
| `answer` | string \| string[] | Clave de respuesta para el answer-key grader. |
| `marks` | number | Peso de la pregunta. |

## Tamaños controlados del banco

- **Target por rol:** 30 preguntas Beginner.
- **Tope absoluto:** 40 preguntas Beginner por rol.
- **Catálogo total objetivo:** 1.440 preguntas Beginner (48 roles × 30).
- **Tope absoluto del catálogo:** 1.920 (48 × 40).

El seeder IA (`npm run seed:quiz:ai`) respeta estos límites y se puede re-ejecutar de forma idempotente.

## Índices

- `{ jobType: 1 }` (`quiz_questions_job_type`).
- `{ jobType: 1, question: 1 }` unique (`quiz_questions_job_type_question`).

## Relaciones

- **N:M → `quiz_attempts`** vía `quiz_attempts.questionIds: ObjectId[]`.

No hay FK formal: al cerrar un intento, se resuelve `questionIds` → preguntas congelando el texto en `quiz_results`.

## Ver también

- [`quiz-attempt.md`](quiz-attempt.md)
- [`quiz-result.md`](quiz-result.md)
- `features/quiz.md` *(próxima iteración)*