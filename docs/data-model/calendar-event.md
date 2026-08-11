# `calendar_events`

Personal calendar events of the user: interviews, deadlines, reminders. Can be linked to a `job_application` or be standalone.

**MongoDB collection:** `calendar_events`
**Mongoose model:** `lib/db/models/calendar-event.js`
**Exported function:** `getCalendarEventModel()`

## Document structure

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

## Fields

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Owner. |
| `scope` | string | `application` (linked) or `personal` (free). |
| `jobApplicationId` | string | If `scope == 'application'`, FK to `job_applications._id`. |
| `title` | string | Displayed text. |
| `type` | string | Category to filter / schedule different reminders. |
| `eventDate` | string | Event day (YYYY-MM-DD or full ISO). |
| `startTime` / `endTime` | string | HH:mm. Empty if all-day event. |
| `status` | string | `scheduled`, `completed`, `cancelled`. |
| `notes` | string | Free notes. |
| `reminderEnabled` | boolean | Whether a reminder should fire. |

## Indexes

- `{ userId: 1, eventDate: 1 }` (`calendar_events_user_event_date`).
- `{ userId: 1, jobApplicationId: 1 }` (`calendar_events_user_application`).

## Relationships

- **N:1 → `users`**.
- **N:1 → `job_applications`** (optional).

## See also

- [`job-application.md`](job-application.md)
- [`features/job-tracker.md`](../features/job-tracker.md)