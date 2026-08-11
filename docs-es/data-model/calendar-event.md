# `calendar_events`

Eventos del calendario personal del usuario: entrevistas, deadlines, recordatorios. Pueden estar vinculados a una `job_application` o ser independientes.

**Colección MongoDB:** `calendar_events`
**Modelo Mongoose:** `lib/db/models/calendar-event.js`
**Función exportada:** `getCalendarEventModel()`

## Estructura del documento

```json
{
  "_id": "ObjectId",
  "userId": "string ObjectId",
  "scope": "'application' | 'personal'",
  "jobApplicationId": "string ObjectId | null",
  "title": "string",
  "type": "'interview' | 'follow_up' | 'deadline' | 'reminder' | 'other'",
  "eventDate": "string ISO-8601",
  "startTime": "string (HH:mm)",
  "endTime": "string (HH:mm)",
  "status": "'scheduled' | 'completed' | 'cancelled' (default 'scheduled')",
  "notes": "string",
  "reminderEnabled": "boolean (default true)",
  "createdAt": "string ISO-8601",
  "updatedAt": "string ISO-8601"
}
```

## Campos

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string | Dueño. |
| `scope` | string | `application` (vinculado) o `personal` (libre). |
| `jobApplicationId` | string | Si `scope == 'application'`, FK a `job_applications._id`. |
| `title` | string | Texto mostrado. |
| `type` | string | Categoría para filtrar/agendar reminders distintos. |
| `eventDate` | string | Día del evento (YYYY-MM-DD o ISO completo). |
| `startTime` / `endTime` | string | HH:mm. Vacío si es evento de día entero. |
| `status` | string | `scheduled`, `completed`, `cancelled`. |
| `notes` | string | Notas libres. |
| `reminderEnabled` | boolean | Si debe generar recordatorio. |

## Índices

- `{ userId: 1, eventDate: 1 }` (`calendar_events_user_event_date`).
- `{ userId: 1, jobApplicationId: 1 }` (`calendar_events_user_application`).

## Relaciones

- **N:1 → `users`**.
- **N:1 → `job_applications`** (opcional).

## Ver también

- [`job-application.md`](job-application.md)
- [`features/job-tracker.md`](../features/job-tracker.md)