# Architecture & Design Decisions

This document explains the *why* behind the Job Board API's structure — the
trade-offs considered and what I'd revisit at larger scale.

## 1. Domain & resource design

**Why a job board?** It's a natural fit for demonstrating role-based access control:
three distinct roles (candidate, employer, admin) with genuinely different
permissions on the same resources, not just "logged in vs. not."

**Core resource: Job. Related resource: Application.** Applications only make sense
in the context of a job, so the primary creation route is nested:
`POST /api/jobs/:jobId/applications`. But applications are *also* something a
candidate wants to see across all their jobs (`GET /api/applications/mine`) and
something an employer manages per-application (`PATCH /api/applications/:id/status`),
so I exposed both a nested router (mounted under `/api/jobs/:jobId/applications`)
and a standalone router (mounted at `/api/applications`) from the same
`application.routes.js` file, sharing the same controller functions. This avoids
duplicating logic while matching how the resource is actually used from two angles.

## 2. Database & ORM: Sequelize over Prisma

I started with Prisma (schema-first, great DX, excellent TypeScript story). I switched
to Sequelize partway through for a concrete reason: Prisma's CLI (`generate` and
`migrate`) requires downloading a compiled query/schema engine binary from
`binaries.prisma.sh` at build/dev time. In network-restricted environments (CI
runners with strict egress allowlists, some corporate networks, air-gapped or
sandboxed dev environments), that download can be blocked, and the whole toolchain
stops working — no engine, no client, no migrations.

Sequelize's migrations and query layer are pure JavaScript running through
`node-postgres` (`pg`), with no external binary to fetch. That's a real
operational trade-off: Prisma's DX (generated types, cleaner query syntax) is
arguably better when its infrastructure is reachable, but Sequelize is more
portable and has zero external dependencies beyond npm packages — which matters a
lot for a project meant to be cloned and run anywhere, including CI pipelines with
locked-down network policies.

**Trade-off accepted:** Sequelize's query builder is more verbose than Prisma's,
and there's no auto-generated TypeScript client (this project is plain JS, so
that's moot here, but it's a real cost for a TS project).

## 3. Migrations, not `sync()`

`sequelize.sync({ alter: true })` is tempting for a small project, but it doesn't
produce a reviewable history of schema changes and can silently do destructive
things in ways `alter` doesn't always make obvious. Using `sequelize-cli`
migrations means:
- Schema changes are explicit, ordered, and reversible (`up`/`down`)
- The same migrations run in dev, test, and production — no drift
- A reviewer can read the migration history to understand how the schema evolved

## 4. Auth: JWT, stateless

Sessions would require server-side storage (Redis, DB-backed sessions) purely to
support horizontal scaling — unnecessary complexity for this project's scope. JWTs
keep the API stateless: any instance can validate a request without a shared
session store, which also matches how the app is deployed (a single Node process,
but designed so it *could* scale horizontally without changes).

**Trade-off accepted:** JWTs can't be revoked before they expire without adding a
blocklist (defeating some of the statelessness benefit). I mitigated this with a
relatively short default expiry (`7d`, configurable) rather than building revocation
infrastructure that's overkill for this project's scope.

## 5. Role-based access control: two layers, not one

RBAC is enforced in two distinct places, deliberately kept separate:

1. **Route-level role gate** (`authorize("EMPLOYER", "ADMIN")` middleware) — a
   coarse-grained "is this role even allowed to call this endpoint" check, evaluated
   before touching the database.
2. **Controller-level ownership check** (`getOwnedJobOr403`, and the equivalent
   inline checks in the application controller) — a fine-grained "does *this*
   employer own *this* job" check, since two different employers share the same
   role but must not be able to touch each other's data.

Keeping these separate (rather than trying to express ownership in generic
middleware) keeps the permission logic readable per-resource, at the cost of a
small amount of repetition between the job and application controllers. For a
project this size, readability won over DRY-ing that repetition into a generic
permission framework.

**Admin cannot be self-assigned at signup.** The signup validator's `role` enum
only accepts `CANDIDATE`/`EMPLOYER`. Admin accounts must be created directly
(seed script or a trusted internal process) — a public API should never let a
request body grant its own elevated privileges. This is tested explicitly
(`auth.test.js` → "does not allow self-assigning the ADMIN role at signup").

## 6. Validation: Zod at the edge

All request validation happens in middleware (`validate(schema)`) before the
controller ever runs, using Zod schemas per resource. This keeps controllers
focused on business logic and guarantees `req.body`/`req.query` are already
well-typed and coerced (e.g., query string `"true"` → boolean, `"5"` → number) by
the time a controller touches them — no manual `parseInt` scattered through
business logic.

## 7. Error handling: one shape, one place

Every error — validation failures, Sequelize constraint violations, JWT errors,
custom `ApiError`s, and genuinely unexpected exceptions — flows through a single
`errorHandler` middleware and comes out in one consistent JSON shape
(`{ success, message, details? }`). Controllers never call `res.status().json()`
for error cases; they just `throw ApiError.xyz(...)` or let Sequelize errors
propagate, and `asyncHandler` forwards any rejected promise to Express's error
pipeline automatically. This eliminates an entire class of bugs where one route
forgets a `try/catch` and crashes the process, or where two routes format errors
slightly differently.

## 8. Search/filter/pagination as a stretch goal, not an afterthought

`GET /api/jobs` supports `search` (title/company/description, case-insensitive),
`location`, `type`, `minSalary`, and standard `page`/`limit` pagination — all
validated through the same Zod pipeline as mutations. This was chosen over other
stretch options (file uploads, background jobs) because search/filter/pagination
is the feature most real job-board users would actually need on day one, and it
exercises Sequelize's query composition (`Op.iLike`, `Op.or`, `Op.gte`,
`findAndCountAll`) in a way that's directly relevant to interview conversations
about query performance and indexing (see indexes on `location`, `type`,
`isActive`, `employerId` in the jobs migration).

## 9. Rate limiting

A general limiter (300 req/15min) protects the whole API from accidental
hammering; a stricter limiter (20 req/15min) sits specifically on
`/api/auth/*` to slow down credential-stuffing/brute-force attempts without
meaningfully affecting normal usage. This is a config-only addition
(`express-rate-limit`) — no new infrastructure — which made it a good stretch
goal to include given the project's scope.

## 10. Testing strategy: real database, no mocking

Tests run against an actual PostgreSQL instance (a separate `job_board_test`
database) through the real HTTP layer via Supertest, rather than mocking
Sequelize or the database. This is slower than unit tests with mocks, but it
catches real bugs that mocks would hide — constraint violations, cascade
behavior, actual query correctness — and gives higher confidence that "tests
pass" means "the API actually works." `tests/globalSetup.js` runs migrations
once before the suite so tests always run against an up-to-date schema. Each
test file cleans all tables before each test for isolation while sharing one
DB connection pool across the run (`--runInBand` avoids cross-test races on
shared tables).

## 11. What I'd change at real scale

- **Cursor-based pagination** instead of offset/limit once job listings grow
  large (offset pagination degrades on large tables).
- **A dedicated search engine** (Postgres full-text search or Elasticsearch)
  once `ILIKE` scans stop being fast enough — the current search is fine at
  the scale of a portfolio project but wouldn't hold up with millions of rows.
- **Refresh tokens** alongside short-lived access tokens, to shrink the JWT
  revocation window without forcing frequent re-logins.
- **A generic policy/permission layer** (e.g., CASL-style) if the number of
  resources and role combinations grew significantly — at 2 resources and 3
  roles, hand-written ownership checks are simpler to read and test.
- **Soft deletes** on jobs/applications instead of hard deletes, to preserve
  an audit trail (e.g., "why did this application disappear").
