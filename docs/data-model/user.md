# `users`

User account and basic profile. This is the root document: almost every other collection has a `userId` field pointing here.

**MongoDB collection:** `users`
**Mongoose model:** `lib/db/models/user.js`
**Exported function:** `getUserModel()`

## Document structure

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

## Fields

| Field | Type | Notes |
|---|---|---|
| `email` | string | Unique. The login identifier. |
| `passwordHash` | string | Hashed in `lib/server/auth/password.js`. Empty if the user is OAuth-only. |
| `firstName` / `lastName` | string | Optional; can be filled in during the CV wizard. |
| `dateOfBirth` | string | ISO-8601. Needed for some legal validations. |
| `photoUrl` | string | Public URL. No server-side upload in the MVP. |
| `headline` | string | Short summary (1 line). Used in the CV. |
| `phone` / `location` / `linkedinUrl` / `githubUrl` / `portfolioUrl` | string | CV data. |
| `role` | string | `'user'`, `'admin'`, or future `'employer'`. Default: `'user'`. |
| `status` | string | `'active'` or `'suspended'`. Default: `'active'`. |
| `employerId` | string \| null | If the user owns a company, points to `employers._id`. |
| `deletedAt` | string \| null | Soft delete. If not null, the user is deleted. |

## Typical values for `role`

- `user` — standard user.
- `admin` — administrator (access to `/admin/*`).
- `employer` — employer-owner (linked to an `employers` document).

## Typical values for `status`

- `active` — can use the platform.
- `suspended` — blocked by admin (accumulated warnings).

## Indexes

- `email` (unique, implicit in the schema definition).
- `status` (`users_status`).
- `role` (`users_role`).

## Relationships

- **1:N → `sessions`**: each user has N active sessions (via `sessions.userId`).
- **1:N → `cv_profiles`**: each user can have N CV profiles.
- **1:N → `quiz_attempts`**, **`quiz_results`**, **`job_applications`**, **`calendar_events`**, **`user_warnings`**, **`support_tickets`**, **`notifications`** (as `targetUserId`).
- **1:1 → `employers`** (optional, via `employerId`).

## Typical usage

```js
import { getUserModel } from '@/lib/db/models/user.js'

const User = await getUserModel()
const user = await User.findOne({ email: 'alice@example.com' })
```

## See also

- [`session.md`](session.md) — active sessions of the user.
- [`collections.md`](collections.md) — general index.