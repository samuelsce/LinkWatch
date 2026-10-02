# LinkWatch

An uptime monitoring tool for websites and HTTP APIs. Register an endpoint, track availability and latency, investigate incidents, and share a public status page.

**Project status:** M1 access and monitor management implemented. GitHub OAuth integration, database-backed sessions, private dashboard, and monitor CRUD are available in configured environments. The real GitHub authorization round trip still requires a local OAuth App and a manual smoke test. Endpoint checks, charts, incident detection, alerts, and public status pages remain planned. There is no production deployment yet.

## Available now

- A responsive Portuguese landing page, explicitly marked as in development.
- GitHub sign-in, session invalidation on logout, and private routes.
- Create, list, edit, pause, resume, and delete monitors with server-side validation.
- Owner isolation, configurable per-user limits, and conflict detection for stale forms.
- Prisma 7 schema and versioned PostgreSQL migrations, including domain constraints.
- Separate worker process with database heartbeat and graceful shutdown.
- Web liveness (`/api/health/live`) and database readiness (`/api/health/ready`).
- Unit tests, PostgreSQL integration, browser journeys with database sessions, and process smoke.
- GitHub Actions for schema, lint, types, tests, build, browser journeys, smoke, and audit.

## Why this project

LinkWatch explores the engineering behind a monitoring product: background scheduling, concurrent workers, incident state transitions, honest availability metrics, tenant isolation, and safe outbound HTTP requests.

## Planned MVP

- GitHub sign-in and a private dashboard.
- HTTP/HTTPS monitors with configurable intervals, timeouts, and expected response status.
- Availability history and latency charts for the last 24 hours, 7 days, and 30 days.
- Automatically opened and resolved incidents.
- An opt-in public status page with selected monitors.

Email and Discord alerts follow the core monitoring release. Multi-region probes, billing, and teams are outside the initial scope.

## Stack

| Layer | Choice | Purpose |
| --- | --- | --- |
| Web | Next.js 16 + React 19 + TypeScript | Private dashboard and monitor management |
| Worker | Node.js 24 + TypeScript + tsx | Heartbeat now; scheduler and HTTP checks in M2 |
| Data | PostgreSQL + Prisma 7 + pg adapter | Versioned schema, checks, incidents, and leases |
| Authentication | Auth.js v5 beta + Prisma adapter + GitHub OAuth | Database sessions; pinned v5 integration per official App Router guide |
| UI | Tailwind CSS 4 | Responsive Portuguese interface |
| Verification | Vitest 5 + PostgreSQL + Playwright + process smoke | Ownership, concurrent writes, CRUD, logout and Origin checks |

Exact dependency versions are pinned in `package.json` and `package-lock.json`. Hosting will be selected after checking worker support and budget; the MVP cannot rely on once-daily cron.

## Project documents

- [Product requirements](docs/PRODUCT.md) — scope, user stories, and acceptance criteria.
- [Interface design](docs/DESIGN.md) — routes, layout, states, and visual direction.
- [Architecture](docs/ARCHITECTURE.md) — web/worker boundaries, scheduling, and deployment approach.
- [Database model](docs/DATABASE.md) — entities, relations, constraints, and indexing.
- [Implementation backlog](docs/BACKLOG.md) — milestones and issues ready for GitHub.
- [Test strategy](docs/TESTING.md) — verification and release gates.
- [Architecture decision](docs/adr/0001-separate-monitoring-worker.md) — why monitoring runs separately.
- [Learning guide (Portuguese)](docs/LEARNING.md) — how the foundation works and what each commit adds.
- [M1 learning guide (Portuguese)](docs/LEARNING_M1.md) — authentication, authorization, mutations, and tests.
- [GitHub OAuth setup (Portuguese)](docs/OAUTH_SETUP.md) — create the local OAuth App and configure credentials.

The interface and planning documents use Portuguese; this README uses English for portfolio reach.

Repository: [samuelsce/LinkWatch](https://github.com/samuelsce/LinkWatch).

## Development

Requirements: Node.js 24, npm, Git, and PostgreSQL. Docker Compose is optional; `compose.yaml` provides PostgreSQL 17 for local development. Its credentials are local examples, not production credentials.

```bash
git clone https://github.com/samuelsce/LinkWatch.git
cd LinkWatch
npm ci
```

Prepare `.env` and generate a session secret without printing it:

```bash
node scripts/setup-local-env.mjs
```

Set `DATABASE_URL` and the GitHub OAuth credentials in `.env`, following the [OAuth setup guide](docs/OAUTH_SETUP.md). Existing environment values are preserved by the setup script. Use `http://localhost:3000` consistently for OAuth; do not alternate with `127.0.0.1`.

With Docker installed, start the local database:

```bash
docker compose up -d db
npm run db:deploy
npm run dev
```

Without Docker, configure an existing PostgreSQL database in `.env`, then run `npm run db:deploy` and `npm run dev`. The app is available at [localhost:3000](http://localhost:3000).

In a second terminal:

```bash
npm run worker:dev
```

The worker writes a heartbeat every five seconds. **It does not check endpoints yet.** Use a distinct `WORKER_ID` for each process. `worker:start` runs without watch mode and currently requires the development dependencies (tsx and Prisma CLI); production packaging belongs to M4.

`db:deploy` applies committed migrations; `db:migrate` creates migrations when changing the schema during development. Commit the schema and its migration together. Do not edit an already applied migration.

## Verification

```bash
npm run db:validate
npm run lint
npm run typecheck
npm test
npm run build
```

Generation and production builds do not need a live database or database credentials. Readiness returns 503 when PostgreSQL is unavailable; liveness can still return 200.

Integration and smoke tests require a **separate disposable database**. For local Compose, create it once:

```bash
docker compose exec db psql -U linkwatch -d postgres -c "CREATE DATABASE linkwatch_test;"
```

PowerShell:

```powershell
$env:TEST_DATABASE_URL = "postgresql://linkwatch:linkwatch@localhost:5432/linkwatch_test"
npm run test:integration
npm run build
npm run test:smoke
```

macOS/Linux: set the same URL with `export TEST_DATABASE_URL=...` before running the commands. Integration tests apply migrations to that test database and clean only their own fixtures. The smoke script starts and stops a production web process and worker.

Browser tests run against the production build and a dedicated test database:

```bash
npm exec -- playwright install chromium
npm run test:integration
npm run build
npm run test:e2e
```

Keep TEST_DATABASE_URL set as above. Browser fixtures create ordinary database sessions; the application has no test login route or authentication bypass. OAuth initiation is intercepted before leaving the test browser; the real GitHub callback needs manual verification after credentials are configured.

M1 validation covers 47 unit tests, 17 PostgreSQL integration tests and 7 browser journeys, plus production build/process smoke and a database outage (ready 503, live 200). Local browser tests use installed Edge; CI uses Chromium and PostgreSQL 17. Consult [GitHub Actions](https://github.com/samuelsce/LinkWatch/actions) for the remote result.

Dependency notes: `@eslint/compat` adapts the Next.js ESLint plugins to ESLint 10 while their peer ranges still refer to older majors. npm may print peer warnings; lint and clean installation are verified. Overrides pin patched `deepmerge-ts` and `mysql2` dependencies used by the Prisma CLI. Reassess these when upgrading Prisma or the lint plugins.

## Portfolio release checklist

- [ ] Working authenticated dashboard and background worker.
- [ ] Tests for URL safety, tenant isolation, incident transitions, and worker concurrency.
- [ ] Public demo with clearly labeled sample data.
- [ ] Deployed application with a healthy worker and database backups.
- [ ] Screenshots and a short demo recording.
- [ ] Reproducible setup and architecture explanation.
- [ ] Documented limitations and operating costs.
- [ ] Choose a license before public release.

No performance figures, uptime claims, test badges, or live-demo links will be added until they are verified.
