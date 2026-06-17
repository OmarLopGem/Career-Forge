# Career Forge — Agent Guidance

## Stack

- **Framework**: Next.js 16.2.7 (App Router, RSC)
- **UI**: React 19, Tailwind CSS v4 (uses `@tailwindcss/postcss` plugin, not a tailwind.config.js)
- **Testing**: Vitest + jsdom + @testing-library/react
- **Linting**: ESLint 9 with `eslint-config-next/core-web-vitals`
- **Database**: MongoDB (connection via `MONGODB_URI` / `MONGODB_DB` env vars, defaults to `mongodb://127.0.0.1:27017` / `career_forge`)
- **Auth**: Firebase in dependencies; currently mocked (`lib/cv-assistant/server/auth/get-current-user-id.js` returns `MOCK_USER_ID`)

## Developer Commands

```bash
npm run dev      # Next.js dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run test     # Vitest run (all tests)
npm run test -- --watch  # Watch mode
```

Run a **single test file**:
```bash
npm run test -- lib/cv-assistant/server/cv-service.test.js
```

## Path Alias

`@/*` resolves to the repo root (configured in both `tsconfig.json` and `jsconfig.json`).

## Architecture

- **`app/`** — Next.js App Router pages and API routes
  - **`app/api/cv/`** — CV Assistant REST API (`/api/cv/profiles`, `/api/cv/profiles/[profileId]/...`)
  - **`app/cv-assistant/`** — CV Assistant page + client components + tests
- **`lib/`** — Server-side / shared logic
  - **`lib/cv-assistant/server/`** — Service layer, MongoDB repositories, AI logic, PDF generation
    - **`server/auth/`** — Auth helpers (currently mocked; swap `getCurrentUserId()` for real Firebase auth)
    - **`server/ai/`** — AI analysis logic
  - **`lib/cv-assistant/test/`** — `mongo-helpers.js` for test MongoDB setup
- **`.agents/skills/`** — OpenCode skills bundled in this repo

## Testing

**Unit tests** (Vitest, jsdom):
- Test files: `lib/**/*.test.{js,jsx,ts,tsx}` and `app/**/*.test.{js,jsx,ts,tsx}`
- Component tests render with `@testing-library/react`; mock data is passed as props
- No MongoDB required for component tests

**Integration tests** (Vitest, jsdom + MongoDB-memory-server):
- `lib/cv-assistant/server/*.test.js` — full service layer tests
- `beforeAll` calls `startMongo()` which launches `MongoMemoryServer` and sets `MONGODB_URI`/`MONGODB_DB`
- `beforeEach` calls `clearMongo()` to drop the test database
- Timeout: 60s for `beforeAll` hooks

## Firebase Auth

Firebase is installed but **auth is mocked**. To integrate real Firebase auth:
1. Add Firebase env vars to `.env.local`
2. Replace `lib/cv-assistant/server/auth/get-current-user-id.js` to call `firebase/auth` and return the actual UID
3. Protect API routes accordingly

## Tailwind CSS v4

This project uses **Tailwind CSS v4** (not v3). The theme uses CSS `@theme` block in `app/globals.css` with custom color tokens. No `tailwind.config.js` exists.
