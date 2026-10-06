# LinkWatch

An uptime monitoring tool for websites and HTTP APIs. Register an endpoint, track availability and latency, investigate incidents, and share a public status page.

**Project status:** M3 presentation implemented. The worker performs safe HTTP checks and detects/resolves incidents. Private pages show real metrics and latency/failure charts; users can publish selected services on a public status page. GitHub OAuth and CRUD are available in configured environments; the real OAuth round trip still needs a local OAuth App and manual smoke. Production deployment, capacity validation and alerts remain planned.

## Available now

- A responsive Portuguese landing page, explicitly marked as in development.
- GitHub sign-in, session invalidation on logout, and private routes.
- Create, list, edit, pause, resume, and delete monitors with server-side validation.
- Owner isolation, configurable per-user limits, and conflict detection for stale forms.
- Prisma 7 schema and versioned PostgreSQL migrations, including domain constraints.
- Standalone worker with five concurrent probes, database leases, crash recovery and graceful shutdown.
- DNS validation and IP pinning, verified TLS, total deadlines, no redirects or response-body downloads.
- Transactional incident detection after two consecutive failures and recovery after success.
- Private history with 24-hour/7-day/30-day windows, observed availability and successful-check latency metrics.
- Interactive latency charts with empty intervals, separate failure/operational markers, keyboard controls and data tables.
- Opt-in public status pages, explicit service selection/public names, slug changes and unpublishing.
- Public data projection excludes endpoint URLs, owner identity, IDs, credentials and technical errors.
- Bounded retention of completed checks older than 30 days; incidents remain until monitor deletion.
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
| Worker | Node.js 24 + TypeScript + tsx | Scheduler, safe HTTP probes, incidents and retention |
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
- [M2 learning guide (Portuguese)](docs/LEARNING_M2.md) — DNS pinning, leases, fencing, incident transitions, metrics and retention.
- [M3 learning guide (Portuguese)](docs/LEARNING_M3.md) — graph aggregation, publication, public projections and worker/browser E2E.
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

The worker polls due monitors every five seconds, reserves only free slots (maximum five per worker), and performs GET probes independently of browser visits. After completion it schedules the next check from the database time plus the configured interval. It records a database heartbeat each loop. Use a distinct `WORKER_ID` for each process. `worker:start` runs without watch mode and currently requires development dependencies (tsx and Prisma CLI); production packaging belongs to M4.

To try monitoring, apply all migrations, start both web and worker, sign in and create a public endpoint monitor. Open its detail page and refresh to see checks and incidents. Expected HTTP status defaults to 200; redirects are not followed. No headers, cookies, authentication credentials or request bodies are supported. Do not disable TLS validation or URL safety to monitor internal services.

Open `/status-page` to configure a title, description and unique slug, select services and review their public names. Pages are unpublished by default. Publishing makes `/status/your-slug` available without login; removing the publication check returns 404. Changing the slug returns 404 at the previous address. Treat title, description and public names as public text. The page refreshes when reloaded; it does not push live updates.

Shutdown stops reservations, allows active work up to 20 seconds before aborting its probes, and waits for persistence. Lost leases can trigger another HTTP request after a crash; fencing prevents two completions for one scheduled cycle. This is not an exactly-once external request guarantee.

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

M3 validation covers 98 unit tests, 44 PostgreSQL/network integration tests and 10 browser journeys, plus production build/process smoke and a database outage (ready 503, live 200). E2E includes a separate worker process collecting a real isolated HTTP outage/recovery cycle while private and anonymous browsers inspect results. It also verifies privacy, slug rename/unpublishing 404s, foreign-selection rejection, mobile layout and chart keyboard controls. Local browser tests use installed Edge; CI uses Chromium and PostgreSQL 17. Consult [GitHub Actions](https://github.com/samuelsce/LinkWatch/actions) for the remote result.

Availability is successful endpoint checks / completed endpoint checks, not time-based uptime or an SLA. Operational errors and periods without checks are excluded, and missing observations are reported separately. Mean and nearest-rank p95 use successful samples only. Metrics cover the full selected window; tables show at most 50 checks and 20 incidents. Checks expire after 30 days; incidents remain. The 100-monitor capacity and scheduling-delay target still need load testing before deployment.

Chart buckets are five minutes (24 hours), one hour (7 days), or six hours (30 days), aligned in UTC. Missing averages break the line; failures never become zero-latency successes. Period p95 comes from all successful checks, not bucket averages. Public availability covers 24 hours and public incident history shows at most ten incidents per selected service. Paused-only/empty selections never claim that services are operational; missing/stale observations degrade the public summary.

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
