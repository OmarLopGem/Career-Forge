# Job Tracker

Job Tracker es el módulo que cubre todo el ciclo de postulación: descubrimiento de ofertas (internas + importadas de Adzuna), gestión del pipeline del candidato (wishlist → applied → interview → offer), calendario de eventos y portal del employer para publicar ofertas y revisar applicants.

## Vista general

```mermaid
flowchart LR
    subgraph UserSide[User side]
        JobsUI[app/jobs]
        Calendar[app/calendar]
        AppsUI[/app/profile, /app/jobs management/]
    end

    subgraph EmployerSide[Employer side]
        EL[app/employer/listings]
        EA[app/employer/applicants]
    end

    subgraph Backend[lib/job-tracker/server]
        Svc[job-tracker.service.js]
        EmpSvc[employer-listing.service.js<br/>employer-applicant.service.js]
        Listings[listings.repository]
        Apps[applications.repository]
        Events[calendar-event.repository]
        Adz[integrations/adzuna.js]
    end

    subgraph External
        DB[(MongoDB)]
        AdzAPI[Adzuna API]
    end

    JobsUI -->|GET /api/job-listings| Svc
    AppsUI -->|GET/POST /api/job-applications| Svc
    Calendar -->|GET/POST /api/calendar/events| Svc

    Svc --> Listings
    Svc --> Apps
    Svc --> Events
    Svc --> Adz

    EL -->|GET/POST /api/employer/listings| EmpSvc
    EA -->|GET/PATCH /api/employer/applicants| EmpSvc
    EmpSvc --> Listings
    EmpSvc --> Apps

    Listings --> DB
    Apps --> DB
    Events --> DB
    Adz --> AdzAPI
```

## Modelos de datos involucrados

- [`job_listings`](../data-model/job-listing.md) — ofertas (internas + externas).
- [`job_applications`](../data-model/job-application.md) — postulaciones del usuario.
- [`calendar_events`](../data-model/calendar-event.md) — entrevistas y recordatorios.
- [`employers`](../data-model/employer.md) — empresas registradas.
- [`cv_profiles`](../data-model/cv-profile.md) — CVs del usuario (se asocian a la postulación).

## Estados de una postulación

Definidos en `lib/job-tracker/server/job-tracker.service.js` (`ALLOWED_APPLICATION_STATUSES`):

```mermaid
stateDiagram-v2
    [*] --> saved: usuario guarda oferta
    [*] --> applied: aplica directamente
    saved --> applied: usuario aplica
    saved --> archived: descarta
    applied --> waiting_response: empresa confirma recepción
    applied --> interview: empresa convoca entrevista
    applied --> rejected: rechazo
    applied --> archived
    waiting_response --> interview
    waiting_response --> rejected
    waiting_response --> archived
    interview --> offer: oferta recibida
    interview --> rejected
    interview --> archived
    offer --> archived: user withdrew
    offer --> rejected: user declined
    rejected --> [*]
    archived --> [*]
```

Cada transición:

- Actualiza `lastActivityAt` y `previousStatus` (para detectar cambios).
- Si `status === 'interview'` o `status === 'offer'`, el servicio puede crear automáticamente un `calendar_event` (configurable).

## Snapshots inmutables

Al crear una `job_application`, el servicio congela:

- `jobSnapshot` — copia del `job_listing` al momento de aplicar.
- `cvProfileSnapshot` — copia del `cv_profile` enviado.

Esto permite que si el employer edita la oferta o el usuario actualiza su CV, **el applicant histórico siga viendo lo que envió**.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant App as /api/job-applications
    participant Svc as job-tracker.service
    participant LR as job-listing.repository
    participant CR as cv-profile.repository
    participant AR as job-application.repository

    U->>App: POST { jobListingId, cvProfileId }
    App->>Svc: serviceCreateApplication(input)
    Svc->>LR: getJobListingById(jobListingId)
    LR-->>Svc: listing
    Svc->>CR: getProfileById(userId, cvProfileId)
    CR-->>Svc: profile
    Svc->>Svc: jobSnapshot = clone(listing)
    Svc->>Svc: cvProfileSnapshot = clone(profile)
    Svc->>AR: createJobApplication({ ..., jobSnapshot, cvProfileSnapshot })
    AR-->>Svc: application
    Svc-->>App: application
    App-->>U: 201 JSON
```

## Pipeline del employer

```mermaid
flowchart TB
    Register[Registro como employer] --> Pending[employer.status='pending']
    Pending -->|admin verifica| Verified[employer.status='verified']
    Verified --> Publish[Publicar job_listing]
    Publish --> Visible[Oferta visible en /jobs]
    Visible --> Applicants[Users aplican]
    Applicants --> Review[employer revisa applicants en /employer/applicants]
    Review --> Accept[Aceptar / rechazar]
    Suspended[employer.status='suspended'] -->|admin action| Visible

    Verified -.->|admin suspende| Suspended
```

- El employer **no puede publicar ofertas** hasta que su `employer.status` sea `'verified'`.
- Una vez suspendido, sus listings pasan a `isActive=false`.
- El endpoint `/api/employer/applicants/[applicationId]` filtra por `employerId` del requester: un employer solo ve applicants a **sus propias** ofertas.

## Import desde Adzuna

```mermaid
sequenceDiagram
    participant Job as /api/job-listings/search
    participant Svc as job-tracker.service
    participant Adz as integrations/adzuna.js
    participant API as Adzuna API
    participant LR as job-listing.repository

    Job->>Svc: searchAdzunaListings({ what, where })
    Svc->>Adz: searchAdzunaJobListings(input)
    Adz->>API: GET https://api.adzuna.com/...
    API-->>Adz: { results: [...] }
    Adz-->>Svc: normalized listings
    Svc-->>Job: listings (read-only)
```

- El import es **on-demand** (no pre-puebla la DB por defecto). El script `scripts/seed-job-listings.mjs` hace upsert masivo a `job_listings`.
- Si `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` faltan, `isAdzunaConfigured()` retorna `false` y la UI muestra "Import disabled".
- Índice único sparse `{ source: 1, externalId: 1 }` garantiza dedup automático.

## Calendario

```mermaid
flowchart LR
    StatusChange[Cambio de status<br/>en job_application] -->|opcional| Event[calendar_event]
    ManualAdd[Usuario crea evento manual] --> Event
    Event --> Reminder[reminderEnabled=true]
    Reminder --> Notification[notification]
```

Eventos posibles (`ALLOWED_EVENT_TYPES`):

- `interview` — entrevista programada.
- `deadline` — fecha límite para responder.
- `follow_up` — recordatorio para hacer follow-up.
- `promised_response` — fecha prometida por la empresa.
- `reminder` — recordatorio genérico.

Los eventos están vinculados a una `job_application` (`scope === 'application'`) o son personales (`scope === 'personal'`).

## API surface

| Endpoint | Método | Propósito |
|---|---|---|
| `/api/job-listings` | GET | Listar ofertas activas. |
| `/api/job-listings/[id]` | GET | Detalle de una oferta. |
| `/api/job-applications` | GET / POST | Listar / crear postulaciones. |
| `/api/job-applications/[id]` | GET / PATCH / DELETE | Detalle + cambio de status + soft delete. |
| `/api/job-applications/[id]/restore` | POST | Restaurar soft-deleted. |
| `/api/calendar/events` | GET / POST | Listar / crear eventos. |
| `/api/calendar/events/[id]` | GET / PATCH / DELETE | Detalle de evento. |
| `/api/employer/listings` | GET / POST | Employer: listar / publicar ofertas. |
| `/api/employer/listings/[id]` | GET / PATCH / DELETE | Employer: editar / cerrar oferta. |
| `/api/employer/applicants` | GET | Employer: listar applicants. |
| `/api/employer/applicants/[id]` | GET / PATCH | Employer: revisar y decidir. |
| `/api/employer/applicants/[id]/profile` | GET | Employer: ver CV snapshot completo. |

## Permisos

| Rol | Puede ver | Puede escribir |
|---|---|---|
| `user` | Sus propias applications, events, listings activas | Sus propias applications, events |
| `employer` (verified) | Sus listings, applicants a sus listings | Sus listings |
| `employer` (pending/suspended) | Sus listings (no activas) | — |
| `admin` | Todo | Todo |

`lib/server/auth/current-user.js` provee helpers `requireCurrentUser()`, `requireAdminUser()`, `requireEmployer()`.

## Ver también

- [`../architecture/data-flow.md`](../architecture/data-flow.md#6-job-application-aplicar-a-oferta)
- [`../architecture/data-flow.md`](../architecture/data-flow.md#7-employer-publicar-oferta)
- [`../architecture/data-flow.md`](../architecture/data-flow.md#8-import-de-ofertas-desde-adzuna)
- [`../data-model/job-listing.md`](../data-model/job-listing.md)
- [`../data-model/job-application.md`](../data-model/job-application.md)
- [`../data-model/calendar-event.md`](../data-model/calendar-event.md)
- [`../data-model/employer.md`](../data-model/employer.md)