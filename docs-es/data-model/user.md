# `users`

Cuenta de usuario y perfil básico. Es el documento raíz: casi todas las demás colecciones tienen un campo `userId` que apunta acá.

**Colección MongoDB:** `users`
**Modelo Mongoose:** `lib/db/models/user.js`
**Función exportada:** `getUserModel()`

## Estructura del documento

```json
{
  "_id": "ObjectId",
  "email": "string (unique, required)",
  "passwordHash": "string | undefined",
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "string ISO-8601 | null",
  "photoUrl": "string",
  "headline": "string",
  "phone": "string",
  "location": "string",
  "linkedinUrl": "string",
  "githubUrl": "string",
  "portfolioUrl": "string",
  "role": "string (default 'user')",
  "status": "string (default 'active')",
  "employerId": "string ObjectId | null",
  "deletedAt": "string ISO-8601 | null",
  "createdAt": "string ISO-8601",
  "updatedAt": "string ISO-8601"
}
```

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `email` | string | Único. Es el identificador de login. |
| `passwordHash` | string | Hasheado en `lib/server/auth/password.js`. Vacío si es usuario OAuth-only. |
| `firstName` / `lastName` | string | Opcionales; pueden completarse en el wizard de CV. |
| `dateOfBirth` | string | ISO-8601. Necesario para algunas validaciones legales. |
| `photoUrl` | string | URL pública. Sin upload server-side en el MVP. |
| `headline` | string | Resumen corto (1 línea). Se usa en el CV. |
| `phone` / `location` / `linkedinUrl` / `githubUrl` / `portfolioUrl` | string | Datos del CV. |
| `role` | string | `'user'`, `'admin'` o futuro `'employer'`. Default: `'user'`. |
| `status` | string | `'active'` o `'suspended'`. Default: `'active'`. |
| `employerId` | string \| null | Si el usuario es owner de una empresa, apunta a `employers._id`. |
| `deletedAt` | string \| null | Soft delete. Si no es null, el usuario está eliminado. |

## Valores típicos de `role`

- `user` — usuario estándar.
- `admin` — administrador (acceso a `/admin/*`).
- `employer` — employer-owner (vinculado a un documento `employers`).

## Valores típicos de `status`

- `active` — puede usar la plataforma.
- `suspended` — bloqueado por admin (warnings acumulados).

## Índices

- `email` (unique, implícito en la definición del schema).
- `status` (`users_status`).
- `role` (`users_role`).

## Relaciones

- **1:N → `sessions`**: cada usuario tiene N sesiones activas (vía `sessions.userId`).
- **1:N → `cv_profiles`**: cada usuario puede tener N perfiles de CV.
- **1:N → `quiz_attempts`**, **`quiz_results`**, **`job_applications`**, **`calendar_events`**, **`user_warnings`**, **`support_tickets`**, **`notifications`** (como `targetUserId`).
- **1:1 → `employers`** (opcional, vía `employerId`).

## Uso típico

```js
import { getUserModel } from '@/lib/db/models/user.js'

const User = await getUserModel()
const user = await User.findOne({ email: 'alice@example.com' })
```

## Ver también

- [`session.md`](session.md) — sesiones activas del usuario.
- [`collections.md`](collections.md) — índice general.