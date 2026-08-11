# `user_warnings`

Advertencias emitidas por un admin contra un usuario. Se acumulan en su historial y pueden derivar en suspensión.

**Colección MongoDB:** `user_warnings`
**Modelo Mongoose:** `lib/db/models/user-warning.js`
**Función exportada:** `getUserWarningModel()`

## Estructura del documento

```json
{
  "_id": "ObjectId",
  "userId": "string ObjectId",
  "adminId": "string ObjectId",
  "message": "string",
  "createdAt": "string ISO-8601"
}
```

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string | Usuario amonestado. |
| `adminId` | string | Admin que emitió la advertencia. |
| `message` | string | Motivo / texto mostrado al usuario. |

## Índices

- `{ userId: 1, createdAt: -1 }` (`user_warnings_user_created`).
- `{ adminId: 1, createdAt: -1 }` (`user_warnings_admin_created`).

## Relaciones

- **N:1 → `users`** (como `userId` y como `adminId`).

## Ver también

- [`user.md`](user.md)
- `features/admin.md` *(próxima iteración)*