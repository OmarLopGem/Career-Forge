# `sessions`

Sesión activa de un usuario. Se usa como mecanismo de auth stateless basado en cookie. MongoDB la expira automáticamente cuando llega a su `expiresAt` (índice TTL).

**Colección MongoDB:** `sessions`
**Modelo Mongoose:** `lib/db/models/session.js`
**Función exportada:** `getSessionModel()`

## Estructura del documento

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

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string (ObjectId) | Apunta a `users._id`. |
| `token` | string | Token aleatorio almacenado en cookie `HttpOnly`. Único. |
| `expiresAt` | Date | Fecha real (no string) porque el índice TTL de Mongo la necesita como `Date` para evaluarla. |
| `createdAt` / `updatedAt` | string ISO-8601 | Timestamps del repositorio. |

## Índices

- `token` (unique).
- `expiresAt` con `expireAfterSeconds: 0` (**TTL**): MongoDB borra el documento automáticamente cuando llega la fecha.

## Flujo de uso

1. Login → `lib/server/auth/auth-service.js` crea un documento aquí con `token` random y `expiresAt = now + TTL`.
2. Cookie `session_token` se setea en el cliente con `HttpOnly + Secure`.
3. Cada request lee la cookie → busca sesión → resuelve `userId`.
4. Logout elimina el documento y limpia la cookie.
5. Si la sesión expira (TTL), MongoDB la borra y la siguiente request recibe 401.

## Ver también

- [`user.md`](user.md)
- [`architecture/overview.md`](../architecture/overview.md) — flujo de auth.