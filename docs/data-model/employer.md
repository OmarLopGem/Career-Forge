# `employers`

Company registered on the platform. A user with `employer` role owns exactly one document here (1:1 relationship via `users.employerId`).

**MongoDB collection:** `employers`
**Mongoose model:** `lib/db/models/employer.js`
**Exported functions:** `getEmployerModel()`, `createEmployer()`, `getEmployerById()`, `getEmployerByOwner()`, `listEmployersByStatuses()`, `listEmployers()`, `setEmployerStatus()`
**Exported constants:** `ALLOWED_EMPLOYER_STATUSES = ['pending', 'verified', 'suspended']`

## Document structure

```json
{
  "_id": "ObjectId",
  "ownerUserId": "string ObjectId | 'pending'",
  "name": "string (required)",
  "website": "string",
  "industry": "string",
  "size": "string",
  "description": "string",
  "status": "'pending' | 'verified' | 'suspended' (default 'pending')",
  "verifiedByUserId": "string ObjectId | null",
  "verifiedAt": "string ISO-8601 | null",
  "createdAt": "string ISO-8601",
  "updatedAt": "string ISO-8601"
}
```

## Fields

| Field | Type | Notes |
|---|---|---|
| `ownerUserId` | string \| 'pending' | Owner. Literal `'pending'` during registration, before creating the user. The service backfills the real ID immediately. |
| `name` | string | Legal name. Required. |
| `website` / `industry` / `size` / `description` | string | Public company profile data. |
| `status` | enum | See below. |
| `verifiedByUserId` | string \| null | Admin who approved the company. Only set when transitioning to `'verified'`. |
| `verifiedAt` | string \| null | Verification timestamp. |

## States (`status`)

- `pending` — created by an employer, not yet approved.
- `verified` — approved by admin. Can publish active `job_listings`.
- `suspended` — blocked by admin. Their listings go to `isActive=false`.

## Indexes

- `ownerUserId` (`employers_owner`).
- `status` (`employers_status`).

## Relationships

- **1:1 → `users`** (via `ownerUserId`).
- **1:N → `job_listings`** (via `job_listings.employerId`).

## Important helpers

```js
// Allows creating the employer before the user (placeholder = 'pending')
createEmployer({ ownerUserId: 'pending', name: 'Acme', ... })

// Changes state and auto-sets verification metadata
setEmployerStatus(employerId, 'verified', adminUserId)
```

## See also

- [`user.md`](user.md)
- [`job-listing.md`](job-listing.md)
- [`features/job-tracker.md`](../features/job-tracker.md) — employer flow.