# `quiz_results`

Historical result of a submitted quiz. Each submitted `quiz_attempt` generates exactly one `quiz_result`.

**MongoDB collection:** `quiz_results`
**Mongoose model:** `lib/db/models/quiz-result.js`
**Exported function:** `getQuizResultModel()`

## Document structure

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

## Fields

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Who completed it. |
| `attemptId` | string | FK to `quiz_attempts._id`. |
| `jobType` / `difficulty` | string | Snapshot (not re-derived from the attempt). |
| `score` | number | Sum of marks of correct questions. |
| `correctCount` | number | Number of correct answers. |
| `totalQuestions` | number | Total questions answered. |
| `totalMarks` | number | Sum of possible marks. |
| `percentage` | number | `score / totalMarks * 100`. |
| `passed` | boolean | `percentage >= 60` (configurable). |
| `gradingMode` | string | `answer-key` (local) or `ai` (when AI is used to validate open answers). |
| `feedback` | string | Human-readable summary. |

## Indexes

- `{ userId: 1, completedAt: -1 }` (`quiz_results_user_completed`).
- `{ userId: 1, jobType: 1, completedAt: -1 }` (`quiz_results_user_job_type_completed`).

## Grading modes

1. **answer-key** (default, fastest): compares the user's answer against `quiz_questions.answer`. Works offline.
2. **ai**: when there are open questions, delegates to the AI model. If the provider fails, falls back to answer-key.

## Relationships

- **N:1 → `users`**.
- **1:1 → `quiz_attempts`**.

## See also

- [`quiz-question.md`](quiz-question.md)
- [`quiz-attempt.md`](quiz-attempt.md)