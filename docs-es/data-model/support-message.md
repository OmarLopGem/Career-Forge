# `support_messages`

Mensaje dentro de un ticket de soporte. Append-only (no se editan).

**Colección MongoDB:** `support_messages`
**Modelo Mongoose:** `lib/db/models/support-message.js`
**Función exportada:** `getSupportMessageModel()`

## Estructura del documento

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

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `ticketId` | ObjectId | FK a `support_tickets._id`. |
| `authorId` | string | Autor del mensaje. |
| `authorRole` | string | Define permisos y UI. |
| `body` | string | Texto (markdown limitado). |

## Índices

- `{ ticketId: 1, createdAt: 1 }` (`support_messages_ticket_created`).

## Relaciones

- **N:1 → `support_tickets`**.
- **N:1 → `users`** (vía `authorId`).

## Ver también

- [`support-ticket.md`](support-ticket.md)