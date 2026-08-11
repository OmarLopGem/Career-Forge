# `cv_profiles`

Perfil de CV editable de un usuario. Un usuario puede tener varios perfiles (uno por postulación / nicho), y exactamente uno está marcado `isDefault=true`.

**Colección MongoDB:** `cv_profiles`
**Modelo Mongoose:** `lib/db/models/cv-profile.js`
**Función exportada:** `getCvProfileModel()`

## Estructura del documento

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

## Secciones del CV

Las secciones están declaradas como `Mixed` en el schema para permitir flexibilidad (el wizard agrega secciones dinámicamente). Las claves son:

- `professionalNiche` — `{ primaryNiche, seniorityLevel, yearsOfExperience, targetRoles }`
- `target` — `{ industries, employmentTypes, locations, salaryRange }`
- `completion` — calculado en cada guardado. Útil para el wizard.
- `personalInfo` — `{ fullName, email, phone, location, links: [{type, url}] }`
- `summary` — `{ headline, content }` (profesional summary)
- `workExperience` — `{ items: [{ title, company, startDate, endDate, current, description, achievements, skills }] }`
- `education` — `{ items: [{ institution, degree, field, startDate, endDate, current }] }`
- `skills` — `{ items: [{ name, level, category }], totalCount }`
- `languages` — `{ items: [{ name, proficiency }] }`
- `projects` — `{ items: [{ name, description, url, technologies, highlights }] }`
- `certifications` — `{ items: [{ name, issuer, date, credentialId, url }] }`

## Campos top-level

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string | FK a `users._id`. |
| `title` | string | Etiqueta humana: "CV Backend Senior", "CV Marketing", etc. |
| `isDefault` | boolean | Solo un perfil por usuario debe tener `true`. |

## Índices

- `{ userId: 1, updatedAt: -1 }` (`cv_profiles_user_updated`).
- `{ userId: 1, isDefault: 1 }` (`cv_profiles_user_default`).

## Relaciones

- **N:1 → `users`**.
- **1:N → `cv_analyses`** (un perfil puede analizarse varias veces; cada análisis guarda el snapshot).
- **1:N → `job_applications`** (vía `job_applications.cvProfileId`).

## Normalización

`lib/cv-assistant/server/normalize-cv-profile.js` se ejecuta al guardar: completa defaults, calcula `completion.percent`, normaliza fechas y agrupa skills por categoría.

## Ver también

- [`cv-analysis.md`](cv-analysis.md)
- [`features/cv-assistant.md`](../features/cv-assistant.md)
- Tipos compartidos en `lib/cv-assistant/types.js`.