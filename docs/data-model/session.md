# `sessions`

Active session of a user. Used as a stateless cookie-based auth mechanism. MongoDB expires it automatically when it reaches `expiresAt` (TTL index).

**MongoDB collection:** `sessions`
**Mongoose model:** `lib/db/models/session.js`
**Exported function:** `getSessionModel()`

## Document structure

```json
{
  "_id": "ObjectId",
  "userId": "string ObjectId",
  "token": "string (unique, required)",
  "expiresAt": "Date",
  "createdAt": "string ISO-8601",
  "updatedAt": "string ISO-8601"
}
```

## Fields

| Field | Type | Notes |
|---|---|---|
| `userId` | string (ObjectId) | Points to `users._id`. |
| `token` | string | Random token stored in `HttpOnly` cookie. Unique. |
| `expiresAt` | Date | Real `Date` (not string) because the Mongo TTL index needs it as `Date` to evaluate it. |
| `createdAt` / `updatedAt` | string ISO-8601 | Repository timestamps. |

## Indexes

- `token` (unique).
- `expiresAt` with `expireAfterSeconds: 0` (**TTL**): MongoDB removes the document automatically when the date arrives.

## Usage flow

1. Login → `lib/server/auth/auth-service.js` creates a document here with a random `token` and `expiresAt = now + TTL`.
2. `session_token` cookie is set on the client with `HttpOnly + Secure`.
3. Each request reads the cookie → looks up session → resolves `userId`.
4. Logout deletes the document and clears the cookie.
5. If the session expires (TTL), MongoDB removes it and the next request gets a 401.

## See also

- [`user.md`](user.md)
- [`architecture/overview.md`](../architecture/overview.md) — auth flow.