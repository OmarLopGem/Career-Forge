# `notifications`

Notificaciones publicadas por admin. Pueden ser broadcast (`audience: 'all'`) o dirigidas a un usuario específico.

**Colección MongoDB:** `notifications`
**Modelo Mongoose:** `lib/db/models/notification.js`
**Función exportada:** `getNotificationModel()`

## Estructura del documento

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

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `createdByUserId` | string | Admin que la creó. |
| `audience` | string | Segmento al que se muestra. |
| `targetUserId` | string | Si `audience == 'user'`, FK a `users._id`. |
| `title` | string | Título corto. |
| `message` | string | Cuerpo (puede tener markdown limitado). |
| `level` | string | Severidad visual. |
| `startsAt` | string | Desde cuándo se muestra. |
| `expiresAt` | string | Hasta cuándo. `null` = indefinida. |
| `isPublished` | boolean | Draft vs publicado. |
| `link` | string | CTA opcional. |

## Índices

- `{ audience: 1, isPublished: 1, startsAt: -1 }` (`notifications_audience_published_starts`).
- `{ audience: 1, targetUserId: 1, isPublished: 1, startsAt: -1 }` (`notifications_audience_target_published_starts`).
- `{ createdByUserId: 1, createdAt: -1 }` (`notifications_creator_created`).

## Relaciones

- **N:1 → `users`** (como autor).
- **N:1 → `users`** (como target, opcional).

## Ver también

- [`user.md`](user.md)
- `features/admin.md` *(próxima iteración)*