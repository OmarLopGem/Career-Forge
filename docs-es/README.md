# Career Forge — Documentación

Documentación técnica y funcional del proyecto **Career Forge**: una plataforma Next.js que ayuda a personas a prepararse para el empleo mediante quiz de orientación, asistente de CV con IA, gestión de postulaciones y herramientas para empleadores.

## Audiencia

Esta documentación está pensada para **dos perfiles**:

- **Desarrolladores** que se incorporan al proyecto y necesitan entender arquitectura, modelo de datos y flujos.
- **Stakeholders no técnicos** (PM, sponsors, jurado) que necesitan diagramas claros para entender capacidades, datos y comportamiento del sistema.

## Stack del proyecto

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.7 (App Router, RSC) |
| UI | React 19, Tailwind CSS v4 |
| Persistencia | MongoDB (Mongoose) |
| Auth | Sesiones por cookie (mock Firebase, listo para integrar) |
| IA | MiniMax (`lib/services/ai/providers/minimax.js`) |
| Testing | Vitest + jsdom + MongoDB Memory Server |

Más detalle en [`architecture/overview.md`](architecture/overview.md).

## Índice de la documentación

### Arquitectura

- [`architecture/overview.md`](architecture/overview.md) — Vista C4 nivel 1 + nivel 2 de componentes.
- [`architecture/data-flow.md`](architecture/data-flow.md) — Diagramas de secuencia de los flujos clave (auth, quiz, CV, job-tracker).

### Modelo de datos (MongoDB)

- [`data-model/collections.md`](data-model/collections.md) — Índice de todas las colecciones + diagrama ER.
- [`data-model/user.md`](data-model/user.md) — Usuarios.
- [`data-model/session.md`](data-model/session.md) — Sesiones con TTL.
- [`data-model/employer.md`](data-model/employer.md) — Empresas registradas.
- [`data-model/cv-profile.md`](data-model/cv-profile.md) — Perfiles de CV del usuario.
- [`data-model/cv-analysis.md`](data-model/cv-analysis.md) — Análisis IA de CV con feedback ATS.
- [`data-model/quiz-question.md`](data-model/quiz-question.md) — Banco de preguntas del quiz.
- [`data-model/quiz-attempt.md`](data-model/quiz-attempt.md) — Intentos de quiz activos.
- [`data-model/quiz-result.md`](data-model/quiz-result.md) — Resultados históricos.
- [`data-model/job-listing.md`](data-model/job-listing.md) — Ofertas de empleo (internas + externas).
- [`data-model/job-application.md`](data-model/job-application.md) — Postulaciones del usuario.
- [`data-model/calendar-event.md`](data-model/calendar-event.md) — Eventos del calendario (entrevistas, follow-ups).
- [`data-model/notification.md`](data-model/notification.md) — Notificaciones globales / por usuario.
- [`data-model/user-warning.md`](data-model/user-warning.md) — Advertencias emitidas por admin.
- [`data-model/support-ticket.md`](data-model/support-ticket.md) — Tickets de soporte.
- [`data-model/support-message.md`](data-model/support-message.md) — Mensajes de un ticket.

### Features

- [`features/cv-assistant.md`](features/cv-assistant.md) — Asistente de CV (wizard + IA + PDF).
- [`features/job-tracker.md`](features/job-tracker.md) — Job tracker (listings + applications + calendar + employer portal).
- [`features/quiz.md`](features/quiz.md) — Motor de quiz (start / submit / grading / racha / generación IA).
- [`features/admin.md`](features/admin.md) — Consola admin (usuarios, employers, notificaciones, soporte, override de CV).

## Cómo usar esta documentación

### Editar en Obsidian

1. Abrí la carpeta `/docs` como vault (o submódulo) en Obsidian.
2. Los bloques ````mermaid` se renderizan nativamente. Editá el diagrama directamente en el bloque.
3. Los wikilinks `[[archivo]]` funcionan dentro del vault.

### Exportar a PDF

```bash
# Pandoc con filtro de Mermaid (genera PDF con diagramas incrustados)
pandoc docs/README.md --pdf-engine=xelatex -o career-forge.pdf
```

Recomendado: usar Obsidian con el plugin **"Better Export PDF"** o **"Pandoc Plugin"**.

### Exportar a PowerPoint

Los diagramas se exportan como SVG/PNG a `assets/diagrams/` y luego se incrustan en slides.

```bash
# Regenerar todos los assets
npm run docs:export
```

Luego en PowerPoint/Keynote: *Insertar → Imagen → seleccionar el SVG/PNG desde `docs/assets/diagrams/`*.

## Convenciones de los diagramas

- **Diagramas de arquitectura**: usan sintaxis `flowchart` de Mermaid (C4 simplificado).
- **Diagramas de flujo**: usan `sequenceDiagram` para interacciones temporales.
- **Modelo de datos**: cada colección tiene un bloque JSON con la estructura del documento + tabla resumen de campos.
- **Diagramas ER**: usan `erDiagram` con la cardinalidad real de las referencias (1:N, N:M cuando aplique).

Para mantener consistencia visual al exportar, todos los bloques usan tema `neutral` por defecto.