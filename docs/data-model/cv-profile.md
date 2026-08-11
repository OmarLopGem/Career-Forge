# `cv_profiles`

Editable CV profile of a user. A user can have several profiles (one per application / niche), and exactly one is marked `isDefault=true`.

**MongoDB collection:** `cv_profiles`
**Mongoose model:** `lib/db/models/cv-profile.js`
**Exported function:** `getCvProfileModel()`

## Document structure

```json
{
  "_id": "ObjectId",
  "userId": "string ObjectId",
  "title": "string",
  "isDefault": "boolean",
  "professionalNiche": "object",
  "target": "object",
  "completion": "object { percent: number, missingSections: string[] }",
  "personalInfo": "object",
  "summary": "object",
  "workExperience": "object { items: [...] }",
  "education": "object { items: [...] }",
  "skills": "object { items: [...], totalCount: number }",
  "languages": "object { items: [...] }",
  "projects": "object { items: [...] }",
  "certifications": "object { items: [...] }",
  "createdAt": "string ISO-8601",
  "updatedAt": "string ISO-8601"
}
```

## CV sections

The sections are declared as `Mixed` in the schema to allow flexibility (the wizard adds sections dynamically). The keys are:

- `professionalNiche` — `{ primaryNiche, seniorityLevel, yearsOfExperience, targetRoles }`
- `target` — `{ industries, employmentTypes, locations, salaryRange }`
- `completion` — calculated on every save. Useful for the wizard.
- `personalInfo` — `{ fullName, email, phone, location, links: [{type, url}] }`
- `summary` — `{ headline, content }` (professional summary)
- `workExperience` — `{ items: [{ title, company, startDate, endDate, current, description, achievements, skills }] }`
- `education` — `{ items: [{ institution, degree, field, startDate, endDate, current }] }`
- `skills` — `{ items: [{ name, level, category }], totalCount }`
- `languages` — `{ items: [{ name, proficiency }] }`
- `projects` — `{ items: [{ name, description, url, technologies, highlights }] }`
- `certifications` — `{ items: [{ name, issuer, date, credentialId, url }] }`

## Top-level fields

| Field | Type | Notes |
|---|---|---|
| `userId` | string | FK to `users._id`. |
| `title` | string | Human label: "Senior Backend CV", "Marketing CV", etc. |
| `isDefault` | boolean | Only one profile per user should have `true`. |

## Indexes

- `{ userId: 1, updatedAt: -1 }` (`cv_profiles_user_updated`).
- `{ userId: 1, isDefault: 1 }` (`cv_profiles_user_default`).

## Relationships

- **N:1 → `users`**.
- **1:N → `cv_analyses`** (a profile can be analysed several times; each analysis saves the snapshot).
- **1:N → `job_applications`** (via `job_applications.cvProfileId`).

## Normalisation

`lib/cv-assistant/server/normalize-cv-profile.js` runs on save: fills defaults, calculates `completion.percent`, normalises dates, and groups skills by category.

## See also

- [`cv-analysis.md`](cv-analysis.md)
- [`features/cv-assistant.md`](../features/cv-assistant.md)
- Shared types in `lib/cv-assistant/types.js`.