# `notifications`

Notifications published by admin. Can be broadcast (`audience: 'all'`) or addressed to a specific user.

**MongoDB collection:** `notifications`
**Mongoose model:** `lib/db/models/notification.js`
**Exported function:** `getNotificationModel()`

## Document structure

```json
{
  "_id": "ObjectId",
  "createdByUserId": "string ObjectId",
  "audience": "'all' | 'admins' | 'employers' | 'user' (default 'all')",
  "targetUserId": "string | null",
  "title": "string",
  "message": "string",
  "level": "'info' | 'warning' | 'success' | 'error' (default 'info')",
  "startsAt": "string ISO-8601",
  "expiresAt": "string ISO-8601 | null",
  "isPublished": "boolean (default true)",
  "link": "string | null",
  "createdAt": "string ISO-8601",
  "updatedAt": "string ISO-8601"
}
```

## Fields

| Field | Type | Notes |
|---|---|---|
| `createdByUserId` | string | Admin who created it. |
| `audience` | string | Segment shown to. |
| `targetUserId` | string | If `audience == 'user'`, FK to `users._id`. |
| `title` | string | Short title. |
| `message` | string | Body (limited markdown). |
| `level` | string | Visual severity. |
| `startsAt` | string | From when it is shown. |
| `expiresAt` | string | Until when. `null` = indefinite. |
| `isPublished` | boolean | Draft vs published. |
| `link` | string | Optional CTA. |

## Indexes

- `{ audience: 1, isPublished: 1, startsAt: -1 }` (`notifications_audience_published_starts`).
- `{ audience: 1, targetUserId: 1, isPublished: 1, startsAt: -1 }` (`notifications_audience_target_published_starts`).
- `{ createdByUserId: 1, createdAt: -1 }` (`notifications_creator_created`).

## Relationships

- **N:1 → `users`** (as author).
- **N:1 → `users`** (as target, optional).

## See also

- [`user.md`](user.md)
- `features/admin.md` *(next iteration)*