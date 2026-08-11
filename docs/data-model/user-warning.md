# `user_warnings`

Warnings issued by an admin against a user. They accumulate in their history and may lead to suspension.

**MongoDB collection:** `user_warnings`
**Mongoose model:** `lib/db/models/user-warning.js`
**Exported function:** `getUserWarningModel()`

## Document structure

```json
{
  "_id": "ObjectId",
  "userId": "string ObjectId",
  "adminId": "string ObjectId",
  "message": "string",
  "createdAt": "string ISO-8601"
}
```

## Fields

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Warned user. |
| `adminId` | string | Admin who issued the warning. |
| `message` | string | Reason / text shown to the user. |

## Indexes

- `{ userId: 1, createdAt: -1 }` (`user_warnings_user_created`).
- `{ adminId: 1, createdAt: -1 }` (`user_warnings_admin_created`).

## Relationships

- **N:1 → `users`** (as both `userId` and `adminId`).

## See also

- [`user.md`](user.md)
- `features/admin.md` *(next iteration)*