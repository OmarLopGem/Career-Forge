# `support_messages`

Message within a support ticket. Append-only (not edited).

**MongoDB collection:** `support_messages`
**Mongoose model:** `lib/db/models/support-message.js`
**Exported function:** `getSupportMessageModel()`

## Document structure

```json
{
  "_id": "ObjectId",
  "ticketId": "ObjectId",
  "authorId": "string ObjectId",
  "authorRole": "'user' | 'admin'",
  "body": "string",
  "createdAt": "string ISO-8601"
}
```

## Fields

| Field | Type | Notes |
|---|---|---|
| `ticketId` | ObjectId | FK to `support_tickets._id`. |
| `authorId` | string | Author of the message. |
| `authorRole` | string | Defines permissions and UI. |
| `body` | string | Text (limited markdown). |

## Indexes

- `{ ticketId: 1, createdAt: 1 }` (`support_messages_ticket_created`).

## Relationships

- **N:1 → `support_tickets`**.
- **N:1 → `users`** (via `authorId`).

## See also

- [`support-ticket.md`](support-ticket.md)