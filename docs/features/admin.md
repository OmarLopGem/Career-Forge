# Admin

The Admin module gives moderators full operational control over Career Forge: user management (status, warnings, lifecycle), employer verification/suspension, manual CV-analysis overrides, support-ticket triage, and platform-wide notifications.

## Overview

```mermaid
flowchart LR
    subgraph AdminSide[Admin side - app/admin]
        UsersUI[Users list + detail]
        WarningsUI[Warnings]
        NotificationsUI[Notifications composer]
        QuizUI[Quiz bank + AI gen]
        EmployersUI[Employers list]
        SupportUI[Support tickets]
        CVOverrideUI[CV profile override]
    end

    subgraph Backend[lib/server/admin + lib/server/support + lib/server/notifications]
        UsersSvc[admin-users.service.js]
        EmpSvc[admin-employers.service.js]
        CVSvc[admin-cv-analysis.service.js]
        NotifSvc[notifications/notification.service.js]
        SupportSvc[support/support.service.js]
        Repos[user-warning / cv-analysis / sessions repos]
    end

    subgraph External
        DB[(MongoDB)]
        LLM[MiniMax]
    end

    UsersUI -->|GET/POST/PATCH /api/admin/users| UsersSvc
    UsersUI -->|POST /api/admin/users/:id/warnings| UsersSvc
    UsersUI -->|PATCH /api/admin/users/:id/status| UsersSvc
    UsersUI -->|GET /api/admin/users/:id/cv-profiles| UsersSvc
    EmployersUI -->|GET /api/admin/employers| EmpSvc
    EmployersUI -->|PATCH .../employers/:id/verify| EmpSvc
    EmployersUI -->|PATCH .../employers/:id/suspend| EmpSvc
    NotificationsUI -->|GET/POST /api/admin/notifications| NotifSvc
    QuizUI -->|GET /api/admin/quiz| Svc[quiz.service]
    QuizUI -->|POST /api/admin/quiz/generate| Svc
    SupportUI -->|/api/admin/support/* via support.service| SupportSvc
    CVOverrideUI -->|PATCH /api/admin/users/:id/cv-profiles/:profileId/analysis| CVSvc

    UsersSvc --> Repos
    EmpSvc --> DB
    CVSvc --> DB
    SupportSvc --> DB
    NotifSvc --> DB
    Svc --> LLM
```

Every admin route handler delegates to a service in `lib/server/admin/`. Every service starts with `await requireAdminUser()`.

## User management

Lives in `lib/server/admin/admin-users.service.js`.

### List users

`GET /api/admin/users?status=&role=&search=&page=`

- Filters: `status`, `role`, free-text `search` (email/name).
- Pagination: `page`, `pageSize` (default 10, max 100).
- Returns `{ users, page, pageSize, total, totalPages }`.

### Create user

`POST /api/admin/users { firstName, lastName, email, password, role }` — admin creates a user directly. Hashes the password with the same helper as public registration.

### View user detail

`GET /api/admin/users/:userId` — returns:

- Safe user (no `passwordHash`).
- Their CV profile summaries.
- Latest CV analysis per profile.
- Aggregated counts: applications, calendar events, quiz results, warnings, support tickets.

### Change status

`PATCH /api/admin/users/:userId/status { status }`

Allowed transitions: `active`, `blocked`, `deleted`. **An admin cannot demote the last active admin** (`countActiveAdmins > 1` guard). When status changes to `blocked` or `deleted`, all the user's sessions are wiped via `deleteSessionsByUserId`.

```mermaid
sequenceDiagram
    actor A as Admin
    participant API as PATCH /api/admin/users/:id/status
    participant Svc as admin-users.service
    participant URepo as users.repository
    participant SRepo as sessions.repository
    participant Notif as notification.service
    participant DB as MongoDB

    A->>API: { status: 'blocked' }
    API->>Svc: serviceSetUserStatus(userId, 'blocked')
    Svc->>URepo: getUserById + countActiveAdmins (guard)
    Svc->>URepo: setUserStatus(userId, 'blocked')
    URepo->>DB: users.updateOne
    Svc->>SRepo: deleteSessionsByUserId(userId)
    SRepo->>DB: sessions.deleteMany({ userId })
    Svc->>Notif: serviceCreateUserNotification (in-app notice)
    Svc-->>API: { user: safeUser }
```

### Issue warnings

`POST /api/admin/users/:userId/warnings { message }`

Persists a `user_warnings` document and optionally notifies the user. Warnings accumulate and can be used by support / moderation flows.

### Reactivate / restore

Admins can move a `deleted` or `suspended` user back to `active`. Sessions are not restored (user must log in again).

## Employer verification

`lib/server/admin/admin-employers.service.js` handles the approval workflow.

```mermaid
sequenceDiagram
    actor A as Admin
    participant API as PATCH /api/admin/employers/:id/verify
    participant Svc as admin-employers.service
    participant EMod as employers model
    participant URepo as users.repository
    participant SRepo as sessions.repository
    participant Notif as notification.service
    participant DB as MongoDB

    A->>API: PATCH .../verify
    API->>Svc: serviceVerifyEmployer(employerId)
    Svc->>EMod: getEmployerById
    alt already verified
        Svc-->>API: { employer } (no-op)
    else
        Svc->>EMod: setEmployerStatus('verified', adminUserId)
        EMod->>DB: employers.updateOne (status, verifiedByUserId, verifiedAt)
        Svc->>URepo: getUserById(ownerUserId)
        opt owner exists and not active
            Svc->>URepo: setUserStatus(ownerUserId, 'active')
        end
        Svc->>Notif: serviceCreateUserNotification (owner notified)
    end
```

Suspension (`.../suspend`) is the inverse flow: status flips to `suspended`, the owner's user status flips to `blocked`, all sessions are wiped, and a notification is sent. Their `job_listings` become inactive (via `isActive=false` propagation, owned by the employer service).

## CV-analysis override

`PATCH /api/admin/users/:userId/cv-profiles/:profileId/analysis` runs `serviceOverrideCvAnalysis` (`lib/server/admin/admin-cv-analysis.service.js`).

Allows an admin to manually correct an AI-generated analysis:

```mermaid
sequenceDiagram
    actor A as Admin
    participant API as PATCH .../analysis
    participant Svc as admin-cv-analysis.service
    participant PRepo as cv-profile.repository
    participant ARepo as cv-analysis.repository
    participant Notif as notification.service
    participant DB as MongoDB

    A->>API: { overallScore, atsFeedback, suggestions, strengths, weaknesses, reason }
    API->>Svc: serviceOverrideCvAnalysis(userId, profileId, patch)
    Svc->>PRepo: getProfileById(userId, profileId)
    Svc->>Svc: clamp scores (0-100) + validate reason length (10-500)
    Svc->>ARepo: createAnalysisFromDraft({ ..., lastEditedByUserId, lastEditedAt, lastEditedReason, gradingMode: 'ai' })
    ARepo->>DB: cv_analyses.insertOne
    Svc->>Notif: notify the user about the manual grade
    Svc-->>API: { analysis }
```

This preserves the audit trail (`lastEditedByUserId`, `lastEditedAt`, `lastEditedReason`) while letting admins correct mistakes.

## Notifications

`lib/server/notifications/notification.service.js` powers both admin-broadcast and per-user messages.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/notifications` | GET | List all notifications (admin). |
| `/api/admin/notifications` | POST | Create + publish. |
| `/api/notifications` | GET | List notifications visible to the current user. |

Notifications have:

- `audience`: `'all' | 'admins' | 'employers' | 'user'`.
- `targetUserId`: required when `audience === 'user'`.
- `startsAt` / `expiresAt`: time window.
- `isPublished`: draft vs live.

A scheduled sweeper (driven by reads with the index `{ audience, isPublished, startsAt }`) hides expired entries.

## Support ticket triage

Admin uses the same `/api/support/tickets` endpoints as users, with extra query params: `status`, `search`, `sort`, `page`, `pageSize`.

`lib/server/support/support.service.js` exposes:

- `serviceListTickets` — admin sees all tickets, paginated.
- `serviceSearchTickets` — full-text over subject/body.
- `serviceGetTicketStats` — counts by status.
- `serviceUpdateTicketStatus` — admin-only status transitions.

See [`../data-model/support-ticket.md`](../data-model/support-ticket.md) and [`../data-model/support-message.md`](../data-model/support-message.md) for the conversation model.

## Permissions

| Role | Can access admin endpoints |
|---|---|
| `user` | No. |
| `employer` (verified or not) | No. |
| `admin` | Yes — all `/api/admin/*` routes. |

Helper: `requireAdminUser()` in `lib/server/auth/current-user.js`.

## Safety rails

The admin service encodes several non-obvious safety rules. They are worth highlighting because they protect users from accidental lock-outs:

1. **Last-admin guard**: cannot demote or delete the last active admin (`countActiveAdmins > 1`).
2. **Self-protection**: an admin cannot demote or delete themselves.
3. **Session wipe**: any status change to `blocked` or `deleted` immediately calls `deleteSessionsByUserId` so the affected user is logged out everywhere.
4. **Audit trail on CV overrides**: `lastEditedByUserId`, `lastEditedAt`, `lastEditedReason` are mandatory; reason must be 10-500 chars.
5. **Employer suspension cascades**: owner user status flips to `blocked`, sessions are wiped, listings become inactive.

## See also

- [`../data-model/user.md`](../data-model/user.md), [`../data-model/user-warning.md`](../data-model/user-warning.md)
- [`../data-model/employer.md`](../data-model/employer.md), [`../data-model/notification.md`](../data-model/notification.md)
- [`../data-model/support-ticket.md`](../data-model/support-ticket.md)
- [`../features/cv-assistant.md`](../features/cv-assistant.md) — manual override targets
- [`../features/job-tracker.md`](../features/job-tracker.md) — employer verification context
- [`../features/quiz.md`](../features/quiz.md) — admin quiz endpoints