# Career Forge — Documentation

Technical and functional documentation of the **Career Forge** project: a Next.js platform that helps people prepare for employment through an orientation quiz, an AI-powered CV assistant, application tracking, and employer-side tooling.

## Audience

This documentation is written for **two profiles**:

- **Developers** joining the project who need to understand the architecture, data model, and key flows.
- **Non-technical stakeholders** (PM, sponsors, jury) who need clear diagrams to understand the system's capabilities, data, and behaviour.

## Project stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 (App Router, RSC) |
| UI | React 19, Tailwind CSS v4 |
| Persistence | MongoDB (Mongoose) |
| Auth | Cookie-based sessions (Firebase mock, ready to integrate) |
| AI | MiniMax (`lib/services/ai/providers/minimax.js`) |
| Testing | Vitest + jsdom + MongoDB Memory Server |

More detail in [`architecture/overview.md`](architecture/overview.md).

## Index

### Architecture

- [`architecture/overview.md`](architecture/overview.md) — C4 level 1 + level 2 components view.
- [`architecture/data-flow.md`](architecture/data-flow.md) — Sequence diagrams for the key flows (auth, quiz, CV, job-tracker).

### Data model (MongoDB)

- [`data-model/collections.md`](data-model/collections.md) — Index of all collections + ER diagram.
- [`data-model/user.md`](data-model/user.md) — Users.
- [`data-model/session.md`](data-model/session.md) — TTL sessions.
- [`data-model/employer.md`](data-model/employer.md) — Registered companies.
- [`data-model/cv-profile.md`](data-model/cv-profile.md) — Editable CV profiles.
- [`data-model/cv-analysis.md`](data-model/cv-analysis.md) — AI analysis with ATS feedback.
- [`data-model/quiz-question.md`](data-model/quiz-question.md) — Quiz question bank.
- [`data-model/quiz-attempt.md`](data-model/quiz-attempt.md) — Active quiz attempts.
- [`data-model/quiz-result.md`](data-model/quiz-result.md) — Historical results.
- [`data-model/job-listing.md`](data-model/job-listing.md) — Job postings (internal + external).
- [`data-model/job-application.md`](data-model/job-application.md) — User applications.
- [`data-model/calendar-event.md`](data-model/calendar-event.md) — Calendar events (interviews, follow-ups).
- [`data-model/notification.md`](data-model/notification.md) — Global / per-user notifications.
- [`data-model/user-warning.md`](data-model/user-warning.md) — Admin-issued warnings.
- [`data-model/support-ticket.md`](data-model/support-ticket.md) — Support tickets.
- [`data-model/support-message.md`](data-model/support-message.md) — Messages within a ticket.

### Features

- [`features/cv-assistant.md`](features/cv-assistant.md) — CV Assistant (wizard + AI + PDF).
- [`features/job-tracker.md`](features/job-tracker.md) — Job tracker (listings + applications + calendar + employer portal).
- [`features/quiz.md`](features/quiz.md) — Quiz engine (start / submit / grading / streak / AI generation).
- [`features/admin.md`](features/admin.md) — Admin console (users, employers, notifications, support, CV override).

## How to use this documentation

### Edit in Obsidian

1. Open the `/docs` folder as a vault (or subfolder) in Obsidian.
2. ````mermaid` blocks render natively. Edit the diagram directly inside the block.
3. Wikilinks `[[file]]` work within the vault.

### Export to PDF

```bash
# Pandoc with Mermaid filter (generates PDF with embedded diagrams)
pandoc docs/README.md --pdf-engine=xelatex -o career-forge.pdf
```

Recommended: use Obsidian with the **"Better Export PDF"** or **"Pandoc Plugin"**.

### Export to PowerPoint

Diagrams are exported as SVG/PNG to `assets/diagrams/` and then embedded into slides.

```bash
# Regenerate all assets
npm run docs:export
```

Then in PowerPoint/Keynote: *Insert → Picture → pick the SVG/PNG from `docs/assets/diagrams/`*.

## Diagram conventions

- **Architecture diagrams**: Mermaid `flowchart` syntax (C4 simplified).
- **Flow diagrams**: `sequenceDiagram` for time-based interactions.
- **Data model**: each collection has a JSON block with the document structure + a field summary table.
- **ER diagrams**: `erDiagram` with the real cardinality of references (1:N, N:M where applicable).

To keep visual consistency when exporting, all blocks use the `neutral` theme by default.