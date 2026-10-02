# LinkWatch

An uptime monitoring tool for websites and HTTP APIs. Register an endpoint, track availability and latency, investigate incidents, and share a public status page.

**Project status:** product and technical planning. The application is not implemented or deployed yet. The specifications below describe the planned behavior, not shipped features.

## Why this project

LinkWatch explores the engineering behind a monitoring product: background scheduling, concurrent workers, incident state transitions, honest availability metrics, tenant isolation, and safe outbound HTTP requests.

## Planned MVP

- GitHub sign-in and a private dashboard.
- HTTP/HTTPS monitors with configurable intervals, timeouts, and expected response status.
- Availability history and latency charts for the last 24 hours, 7 days, and 30 days.
- Automatically opened and resolved incidents.
- An opt-in public status page with selected monitors.

Email and Discord alerts follow the core monitoring release. Multi-region probes, billing, and teams are outside the initial scope.

## Proposed stack

| Layer | Choice | Purpose |
| --- | --- | --- |
| Web | Next.js App Router + TypeScript | Dashboard, authentication, and public pages |
| Monitoring | Separate Node.js + TypeScript worker | Scheduled HTTP checks independent of page visits |
| Data | PostgreSQL + Prisma | Monitor configuration, checks, incidents, and leases |
| Authentication | Auth.js with GitHub OAuth, subject to integration validation | Identity without maintaining password credentials |
| UI | Tailwind CSS and an accessible component system | Responsive interface |
| Verification | Vitest, database integration tests, Playwright | Domain rules, concurrency, and critical user journeys |

Library versions will be selected and locked during scaffolding. Hosting will be selected after checking worker support and budget; the MVP cannot rely on once-daily cron.

## Project documents

- [Product requirements](docs/PRODUCT.md) — scope, user stories, and acceptance criteria.
- [Interface design](docs/DESIGN.md) — routes, layout, states, and visual direction.
- [Architecture](docs/ARCHITECTURE.md) — web/worker boundaries, scheduling, and deployment approach.
- [Database model](docs/DATABASE.md) — entities, relations, constraints, and indexing.
- [Implementation backlog](docs/BACKLOG.md) — milestones and issues ready for GitHub.
- [Test strategy](docs/TESTING.md) — verification and release gates.
- [Architecture decision](docs/adr/0001-separate-monitoring-worker.md) — why monitoring runs separately.

The interface and planning documents use Portuguese; this README uses English for portfolio reach.

Repository: [samuelsce/LinkWatch](https://github.com/samuelsce/LinkWatch).

## Development

There are no application commands yet. Scaffolding is the first implementation milestone. It will add a lockfile, `.env.example`, local PostgreSQL setup, migrations, and instructions verified from a clean checkout.

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
