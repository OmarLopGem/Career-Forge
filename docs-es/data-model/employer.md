# `employers`

Empresa registrada en la plataforma. Un usuario con rol `employer` posee exactamente un documento aquí (relación 1:1 vía `users.employerId`).

**Colección MongoDB:** `employers`
**Modelo Mongoose:** `lib/db/models/employer.js`
**Funciones exportadas:** `getEmployerModel()`, `createEmployer()`, `getEmployerById()`, `getEmployerByOwner()`, `listEmployersByStatuses()`, `listEmployers()`, `setEmployerStatus()`
**Constantes exportadas:** `ALLOWED_EMPLOYER_STATUSES = ['pending', 'verified', 'suspended']`

## Estructura del documento

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

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `ownerUserId` | string \| 'pending' | Owner. Valor literal `'pending'` durante el registro, antes de crear el usuario. El servicio backfillea el ID real inmediatamente. |
| `name` | string | Razón social. Required. |
| `website` / `industry` / `size` / `description` | string | Datos públicos del perfil corporativo. |
| `status` | enum | Ver abajo. |
| `verifiedByUserId` | string \| null | Admin que aprobó la empresa. Solo se setea al pasar a `'verified'`. |
| `verifiedAt` | string \| null | Timestamp de la verificación. |

## Estados (`status`)

- `pending` — creada por un employer, aún no aprobada.
- `verified` — aprobada por admin. Puede publicar `job_listings` activos.
- `suspended` — bloqueada por admin. Sus listings pasan a `isActive=false`.

## Índices

- `ownerUserId` (`employers_owner`).
- `status` (`employers_status`).

## Relaciones

- **1:1 → `users`** (vía `ownerUserId`).
- **1:N → `job_listings`** (vía `job_listings.employerId`).

## Helpers importantes

```js
// Permite crear el employer antes que el user (placeholder = 'pending')
createEmployer({ ownerUserId: 'pending', name: 'Acme', ... })

// Cambia estado y setea metadata de verificación automáticamente
setEmployerStatus(employerId, 'verified', adminUserId)
```

## Ver también

- [`user.md`](user.md)
- [`job-listing.md`](job-listing.md)
- [`features/job-tracker.md`](../features/job-tracker.md) — flujo employer.