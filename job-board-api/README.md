# Job Board API

A production-style REST API for a job board: **employers post jobs, candidates apply.**
Built with Node.js, Express, PostgreSQL (via Sequelize), and JWT authentication with
role-based access control.

This is a portfolio/interview project demonstrating full-stack backend fundamentals:
relational data modeling, auth, validation, error handling, testing, and deployment.

> 📄 See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions and trade-offs.

---

## Live demo

- **API base URL:** https://neuro-five-internship-tasks.vercel.app/api-docs/>` *(fill in after deploying — see [Deployment](#deployment))*
- **Interactive API docs (Swagger UI):** `https://<your-deployed-url>/api-docs`
- **Postman collection:** [`postman_collection.json`](./postman_collection.json) — import directly into Postman

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Data model](#data-model)
- [Getting started (local dev)](#getting-started-local-dev)
- [Running tests](#running-tests)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Roles & permissions](#roles--permissions)
- [Error handling](#error-handling)
- [Docker](#docker)
- [Deployment](#deployment)
- [Project structure](#project-structure)

---

## Features

**MVP**
- Full CRUD on **Jobs** (core resource) and **Applications** (related resource), persisted in PostgreSQL
- JWT authentication (signup / login / `me`) with **3 roles**: `CANDIDATE`, `EMPLOYER`, `ADMIN`
- Role-based access control enforced on 8+ endpoints (not just 2)
- Ownership checks (an employer can only edit *their own* jobs; a candidate can only withdraw *their own* application)
- Input validation on every mutating endpoint via [Zod](https://zod.dev)
- Consistent JSON error shape across the whole API
- 30 Supertest integration tests (required: 8)
- Swagger/OpenAPI documentation generated from route annotations, served at `/api-docs`
- Postman collection as an alternative way to explore the API

**Stretch goals implemented**
- ✅ **Search, filtering & pagination** on `GET /api/jobs` (by keyword, location, job type, min salary, page/limit)
- ✅ **Rate limiting** (general API limiter + a stricter one on auth endpoints to slow brute-force attempts)
- ✅ **Docker** — `Dockerfile` + `docker-compose.yml` spin up the API and a Postgres instance together

---

## Tech stack

| Layer          | Choice                                    |
|----------------|--------------------------------------------|
| Runtime        | Node.js 18+                                |
| Framework      | Express 4                                  |
| Database       | PostgreSQL                                 |
| ORM            | Sequelize 6 (+ `sequelize-cli` migrations) |
| Auth           | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` |
| Validation     | Zod                                        |
| Testing        | Jest + Supertest                           |
| Docs           | `swagger-jsdoc` + `swagger-ui-express`     |
| Security       | `helmet`, `cors`, `express-rate-limit`     |
| Containerization | Docker / docker-compose                  |

---

## Data model

```
User (1) ──< (many) Job          [employerId FK]
User (1) ──< (many) Application  [candidateId FK]
Job  (1) ──< (many) Application  [jobId FK]
```

- A `User` has a `role`: `CANDIDATE`, `EMPLOYER`, or `ADMIN`.
- A `Job` belongs to the `EMPLOYER` who created it.
- An `Application` links one `Job` to one `CANDIDATE`, with a **unique constraint on
  `(jobId, candidateId)`** — a candidate can't apply to the same job twice.
- Deleting a `User` or `Job` cascades to their dependent `Application`/`Job` rows.

Full schema lives in [`migrations/`](./migrations).

---

## Getting started (local dev)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally, **or** Docker (see [Docker](#docker) to skip local Postgres entirely)

### 1. Clone and install
```bash
git clone <your-repo-url>
cd job-board-api
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` — at minimum set `DATABASE_URL` and generate a real `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Create the databases
```sql
CREATE DATABASE job_board;
CREATE DATABASE job_board_test;  -- used only by the test suite
```

### 4. Run migrations
```bash
npm run migrate
```

### 5. (Optional) Seed demo data
```bash
npm run seed
```
Creates three demo accounts (password for all: `password123`):
- `admin@jobboard.dev` (ADMIN)
- `employer@jobboard.dev` (EMPLOYER) — owns one seeded job
- `candidate@jobboard.dev` (CANDIDATE) — has one seeded application

### 6. Start the server
```bash
npm run dev     # with auto-reload (nodemon)
# or
npm start       # plain node
```
The API is now running at `http://localhost:4000`, with docs at `http://localhost:4000/api-docs`.

---

## Running tests

The test suite runs real HTTP requests (via Supertest) against a real PostgreSQL
database — no mocking of the database layer, so tests exercise the full stack
including Sequelize, validation, and RBAC.

```bash
# Make sure job_board_test exists and TEST_DATABASE_URL in .env points to it
npm test
```

This automatically applies migrations to the test database before running (see
`tests/globalSetup.js`), then runs all 30 tests across 3 suites:

| Suite                    | Tests | Covers |
|---------------------------|-------|--------|
| `tests/auth.test.js`       | 8     | Signup, login, `/me`, validation errors, duplicate email, ADMIN self-assignment blocked |
| `tests/jobs.test.js`       | 10    | CRUD, RBAC, ownership checks, search/filter/pagination, 404s |
| `tests/applications.test.js` | 12  | Applying, duplicate-application prevention, employer review flow, status updates, withdrawal |

---

## Environment variables

See [`.env.example`](./.env.example) for the full list with comments. Summary:

| Variable | Required | Description |
|----------|----------|--------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string for dev/production |
| `TEST_DATABASE_URL` | for testing | Separate DB so `npm test` never touches dev data |
| `JWT_SECRET` | ✅ | Long random string used to sign JWTs |
| `JWT_EXPIRES_IN` | – | Token lifetime, e.g. `7d` (default: `7d`) |
| `PORT` | – | Port to listen on (default: `4000`) |
| `NODE_ENV` | – | `development` \| `test` \| `production` |
| `DB_SSL` | – | Set `true` in production if your DB requires SSL (most managed Postgres hosts do) |
| `PUBLIC_URL` | – | Shown as the "Production" server in Swagger UI |

---

## API reference

Full interactive docs live at **`/api-docs`** once the server is running. Summary:

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | – | Register (`role` optional, defaults to `CANDIDATE`; `ADMIN` cannot self-assign) |
| POST | `/api/auth/login` | – | Log in, receive a JWT |
| GET | `/api/auth/me` | ✅ | Get the current user |

### Jobs
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/jobs` | – | List jobs. Query: `page`, `limit`, `search`, `location`, `type`, `minSalary`, `isActive` |
| POST | `/api/jobs` | EMPLOYER/ADMIN | Create a job |
| GET | `/api/jobs/mine` | EMPLOYER/ADMIN | List jobs posted by the current employer |
| GET | `/api/jobs/:id` | – | Get one job |
| PATCH | `/api/jobs/:id` | owning EMPLOYER/ADMIN | Update a job |
| DELETE | `/api/jobs/:id` | owning EMPLOYER/ADMIN | Delete a job |

### Applications
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/jobs/:jobId/applications` | CANDIDATE | Apply to a job (one application per candidate per job) |
| GET | `/api/jobs/:jobId/applications` | owning EMPLOYER/ADMIN | List applicants for a job |
| GET | `/api/applications/mine` | CANDIDATE | List the current user's own applications |
| PATCH | `/api/applications/:id/status` | owning EMPLOYER/ADMIN | Update application status (`PENDING`→`REVIEWED`/`ACCEPTED`/`REJECTED`) |
| DELETE | `/api/applications/:id` | owning CANDIDATE/ADMIN | Withdraw an application |

All authenticated endpoints expect `Authorization: Bearer <token>`.

---

## Roles & permissions

| Role | Can do |
|---|---|
| **CANDIDATE** | Browse/search jobs, apply, view & withdraw own applications |
| **EMPLOYER** | Everything a candidate can browse, plus: create/update/delete *own* jobs, view/manage applicants to *own* jobs |
| **ADMIN** | Full access to all jobs and applications regardless of ownership |

RBAC is enforced in two layers:
1. **Role check** (`authorize("EMPLOYER", "ADMIN")` middleware) — is this role even allowed to hit this route?
2. **Ownership check** (in the controller) — does *this specific* employer own *this specific* job?

Both layers are covered by tests (see `jobs.test.js` → "ownership enforcement" and
`applications.test.js` → role-check tests).

---

## Error handling

Every error response has the same shape:
```json
{
  "success": false,
  "message": "Human-readable summary",
  "details": [{ "field": "email", "message": "Must be a valid email address" }]
}
```
`details` is only present for validation errors. All errors go through a single
`errorHandler` middleware (`src/middleware/errorHandler.js`) that maps Sequelize
errors (unique constraint, FK violation, validation), JWT errors, and generic
`ApiError`s to consistent HTTP status codes.

---

## Docker

Spin up the API **and** a Postgres instance with one command — no local Postgres install needed:

```bash
docker compose up --build
```

This builds the API image, waits for Postgres to be healthy, runs migrations, and
starts the server on `http://localhost:4000`. Edit `docker-compose.yml` if you want
to change the default dev credentials/JWT secret before deploying anywhere real.

---

## Deployment

This API is stateless and config-driven via environment variables, so it deploys
cleanly to any Node host with a managed Postgres add-on (Render, Railway, Fly.io,
Heroku, etc.). General steps:

1. Provision a managed PostgreSQL database and copy its connection string.
2. Create the web service from this repo, with:
   - **Build command:** `npm install`
   - **Start command:** `npm run migrate && npm start`
   - **Environment variables:** `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV=production`, `DB_SSL=true` (most managed Postgres requires SSL), `PUBLIC_URL` (your deployed URL, for Swagger)
3. Deploy. Confirm `GET /health` returns `200`.
4. Visit `/api-docs` on the deployed URL to confirm Swagger picked up `PUBLIC_URL`.

---

## Project structure

```
job-board-api/
├── config/config.js          # sequelize-cli DB config (per NODE_ENV)
├── migrations/                # Sequelize migrations (schema history)
├── seeders/seed.js            # Demo data seed script
├── src/
│   ├── app.js                 # Express app assembly (middleware, routes, docs)
│   ├── server.js               # Entry point
│   ├── config/database.js      # Runtime Sequelize connection
│   ├── models/                 # Sequelize models + associations
│   ├── controllers/            # Route handlers (business logic)
│   ├── routes/                 # Route definitions + Swagger annotations
│   ├── middleware/              # auth, validate, errorHandler, rateLimiter
│   ├── validators/              # Zod schemas per resource
│   ├── utils/                   # ApiError, asyncHandler
│   └── swagger.js               # OpenAPI spec generation
├── tests/                       # Jest + Supertest integration tests
├── Dockerfile / docker-compose.yml
├── postman_collection.json
├── ARCHITECTURE.md
└── README.md
```

---

## License

MIT
