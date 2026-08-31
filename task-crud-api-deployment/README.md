# Task CRUD API (MongoDB + JWT Auth + Validation Edition)

A REST API for managing Tasks, backed by **MongoDB**, with **JWT-based
authentication**, **input validation**, and **centralized error handling**.
Tasks belong to a **Category** and can have many **Comments** — two real
relationships, both a "belongs-to" (Task → Category) and a "has-many"
(Task → Comments), demonstrated with a nested endpoint. Lists support
**filtering, sorting, and pagination** so large datasets aren't dumped all
at once.

Every response — success or failure — uses one consistent shape, and every
endpoint that accepts data validates it before it ever reaches the database
(see **§5 Validation & Error Handling** below).

## Tech stack

- Node.js + Express
- MongoDB + Mongoose
- bcrypt for password hashing
- jsonwebtoken (JWT) for auth tokens
- express-validator for input validation
- dotenv for environment variables
- Jest + Supertest for testing
- pino + pino-http for structured logging
- Deployed on Vercel (serverless), monitored with UptimeRobot

## Schema

**Category**
| Field       | Type   | Notes             |
|-------------|--------|-------------------|
| name        | String | required, unique  |
| description | String | optional          |

**Task**
| Field       | Type     | Notes                                   |
|-------------|----------|------------------------------------------|
| title       | String   | required                                |
| description | String   | optional                                |
| status      | String   | `pending` \| `in-progress` \| `completed` |
| dueDate     | Date     | optional                                |
| category    | ObjectId | references `Category._id` (nullable)    |

**Comment**
| Field       | Type     | Notes                                   |
|-------------|----------|------------------------------------------|
| task        | ObjectId | required, references `Task._id`          |
| author      | ObjectId | required, references `User._id`          |
| content     | String   | required, max 500 characters             |

Each Task optionally references one Category (`ref: 'Category'`), and each
Comment references the Task it belongs to plus the User who wrote it —
`GET` requests populate these inline via `.populate()`.

## 1. Database setup

You need a MongoDB instance. Pick one:

### Option A — Local MongoDB
1. Install MongoDB Community Server: https://www.mongodb.com/docs/manual/installation/
2. Start it: `mongod` (or via your OS service manager)
3. Your connection string will be: `mongodb://127.0.0.1:27017/task_crud_api`

### Option B — MongoDB Atlas (free cloud tier, no local install)
1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Add a database user (Database Access) and allow your IP (Network Access)
3. Click **Connect → Drivers**, copy the connection string, and replace
   `<username>`/`<password>` with your DB user's credentials

## 2. Environment variables

Never hardcode secrets. Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

`.env`:
```
MONGODB_URI=mongodb://127.0.0.1:27017/task_crud_api
PORT=5000
DB_CONNECT_RETRIES=5
DB_CONNECT_RETRY_DELAY=3000
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRES_IN=1h
```

Generate a strong `JWT_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`.env` is already in `.gitignore` — it will never be committed. The server
refuses to start if `MONGODB_URI` or `JWT_SECRET` is missing, rather than
running in a broken or insecure state.

## 3. Install & run

```bash
npm install
npm start
# or, for auto-restart on file changes:
npm run dev
```

On startup you should see:
```
[DB] Connected to MongoDB (attempt 1/5)
[Server] Listening on port 5000
```

If MongoDB isn't reachable, the server will **retry** the connection
(`DB_CONNECT_RETRIES` times, waiting `DB_CONNECT_RETRY_DELAY` ms between
attempts), logging each failure clearly, and exit with a non-zero code if it
never connects — it will never crash silently or serve requests against a
dead connection. While running, any mid-session disconnects are also logged
and CRUD routes return `503 Database unavailable` instead of hanging.

## 4. Authentication

Signup and login are public. Every write operation (create/update/delete) on
Tasks and Categories requires a valid JWT; reads (`GET`) stay public.

### Auth flow

1. **Signup** — `POST /api/auth/signup` with `{ "email": "...", "password": "..." }`.
   The password is hashed with **bcrypt** before it's ever written to the
   database — the plaintext password is never stored. Returns a JWT.
2. **Login** — `POST /api/auth/login` with the same credentials. The server
   compares the submitted password against the stored bcrypt hash (never
   decrypts anything, since bcrypt hashes are one-way) and returns a JWT if
   it matches.
3. **Using the token** — attach it to protected requests as a header:
   ```
   Authorization: Bearer <your-token-here>
   ```
4. **Token expiry** — tokens expire after `JWT_EXPIRES_IN` (default `1h`).
   Expired tokens are rejected with a specific error so the client knows to
   log in again rather than treating it as a generic failure.

### Auth endpoints

| Method | Route             | Auth required | Description                    |
|--------|-------------------|:--------------:|--------------------------------|
| POST   | /api/auth/signup  | No             | Create an account, returns JWT |
| POST   | /api/auth/login   | No             | Log in, returns JWT            |

### Error responses

| Situation                  | Status | Body                                             |
|-----------------------------|:------:|---------------------------------------------------|
| Missing/malformed token     | 401    | `{ "success": false, "error": "No token provided" }` |
| Expired token                | 401    | `{ "success": false, "error": "Token expired, please log in again" }` |
| Invalid/tampered token       | 401    | `{ "success": false, "error": "Invalid token" }`  |
| Wrong email or password      | 401    | `{ "success": false, "error": "Invalid email or password" }` |
| Email already registered     | 409    | `{ "success": false, "error": "An account with this email already exists" }` |

Wrong-credential and invalid-token responses are intentionally generic (they
don't say *which* part was wrong) so they can't be used to guess whether an
email is registered or probe for valid tokens.

### Example: full flow with curl

```bash
# 1. Sign up
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"mehak@example.com","password":"supersecret123"}'
# → 201 { "success": true, "data": { "token": "...", "user": {...} } }

# 2. Log in (or reuse the token from signup)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mehak@example.com","password":"supersecret123"}'
# → 200 { "success": true, "data": { "token": "...", "user": {...} } }

# 3. Access a protected route WITH the token
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-from-step-2>" \
  -d '{"title":"Write README"}'
# → 201, task created

# 4. Access the same route WITHOUT a token
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"This should fail"}'
# → 401 { "success": false, "error": "No token provided" }
```

## 5. Validation & Error Handling

Every endpoint that accepts a body validates required fields, types, and
length limits with `express-validator` before touching the database.
Validation failures, database errors, and thrown application errors all
flow through **one centralized error handler** — nothing crashes the
server or leaks a stack trace to the client. Full errors are logged
server-side only.

### Standard response shape

Every response, success or failure, looks like one of these two shapes —
never anything else:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Human-readable message" }

// Error with field-level validation details
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "title", "message": "Title is required" }
  ]
}
```

### 5 example bad requests and their responses

**1. Missing required field** — `POST /api/tasks` with `{}`
```json
// 400
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "field": "title", "message": "Title is required" }]
}
```

**2. Invalid enum value** — `POST /api/tasks` with `{"title":"x","status":"done"}`
```json
// 400
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "field": "status", "message": "Status must be one of: pending, in-progress, completed" }]
}
```

**3. Invalid ID in the URL** — `GET /api/tasks/not-a-real-id`
```json
// 400
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "field": "id", "message": "Invalid task id" }]
}
```

**4. Malformed JSON body** — `POST /api/tasks` with body `{ this isn't valid json`
```json
// 400
{ "success": false, "error": "Malformed JSON in request body" }
```

**5. Duplicate entry** — `POST /api/categories` with a `name` that already exists
```json
// 409
{ "success": false, "error": "Duplicate value for name" }
```

**6. Field too long** — `POST /api/tasks` with a 200-character title
```json
// 400
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "field": "title", "message": "Title must be 120 characters or fewer" }]
}
```

**7. Resource not found** — `GET /api/tasks/64f1a2b3c4d5e6f7a8b9c0d1` (valid
ID format, but no task with that ID exists)
```json
// 404
{ "success": false, "error": "Task not found" }
```

An empty request body on an endpoint with only optional fields (e.g.
`PUT /api/tasks/:id` with `{}`) is valid and simply updates nothing —
it's only rejected when a *required* field like `title` is empty.

## 6. Filtering, Sorting & Pagination

`GET /api/tasks` and `GET /api/tasks/:id/comments` both support query
parameters so large datasets aren't returned all at once.

### Filtering (Tasks only)
| Param      | Example              | Notes                          |
|------------|----------------------|----------------------------------|
| `status`   | `?status=completed`  | One of `pending`, `in-progress`, `completed` |
| `category` | `?category=<id>`     | Must be a valid category ObjectId |

### Sorting
| Param     | Example            | Notes                                              |
|-----------|--------------------|------------------------------------------------------|
| `sortBy`  | `?sortBy=dueDate`   | Ascending by that field                             |
| `sortBy`  | `?sortBy=-createdAt`| Prefix with `-` for descending                      |

Tasks: allowed fields are `createdAt`, `updatedAt`, `title`, `dueDate`, `status`.
Comments: allowed fields are `createdAt`, `updatedAt`. An unrecognized
`sortBy` value is rejected with a `400 Validation failed`, not silently ignored.

### Pagination
| Param   | Default | Notes                              |
|---------|---------|---------------------------------------|
| `page`  | `1`     | Must be a positive integer            |
| `limit` | `10`    | 1–100; requests above 100 are rejected |

Paginated responses include a `pagination` block:
```json
{
  "success": true,
  "data": [ /* up to `limit` items */ ],
  "pagination": { "page": 2, "limit": 10, "total": 35, "totalPages": 4 }
}
```

### Combined example
```bash
curl "http://localhost:5000/api/tasks?status=pending&sortBy=dueDate&page=1&limit=5"
```
Returns page 1 of up to 5 pending tasks, soonest due date first.

## 7. Seeding sample data

To actually test pagination and filtering, seed the database with 35 sample
tasks across 5 categories (plus a handful of comments):

```bash
npm run seed
```

This **clears existing Tasks, Categories, and Comments** (but not Users, so
your login stays intact) and creates fresh sample data. If no user account
exists yet, it also creates a demo login: `seed.user@example.com` /
`seedpassword123`, used to author the sample comments.

## 8. API Endpoints

### Categories
| Method | Route               | Auth required | Description       |
|--------|---------------------|:--------------:|--------------------|
| GET    | /api/categories      | No             | List all categories |
| POST   | /api/categories      | Yes            | Create a category   |
| DELETE | /api/categories/:id  | Yes            | Delete a category    |

### Tasks
| Method | Route          | Auth required | Description                              |
|--------|----------------|:--------------:|-------------------------------------------|
| GET    | /api/tasks     | No             | List tasks — supports `?status=`, `?category=`, `?sortBy=`, `?page=`, `?limit=` |
| GET    | /api/tasks/:id | No             | Get one task                             |
| POST   | /api/tasks     | Yes            | Create a task                            |
| PUT    | /api/tasks/:id | Yes            | Update a task                            |
| DELETE | /api/tasks/:id | Yes            | Delete a task                            |

### Comments (nested under Tasks)
| Method | Route                        | Auth required | Description                                  |
|--------|-------------------------------|:--------------:|------------------------------------------------|
| GET    | /api/tasks/:id/comments       | No             | List comments for a task — supports `?sortBy=`, `?page=`, `?limit=` |
| POST   | /api/tasks/:id/comments       | Yes            | Add a comment to a task                       |
| DELETE | /api/comments/:id             | Yes            | Delete your own comment                       |

`GET /health` reports server + DB connection status.

## 9. Example requests

Create a category (requires a token — see the Authentication section above):
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Work", "description": "Job-related tasks"}'
```

Create a task linked to that category (use the `_id` returned above):
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Finish CRUD assignment", "status": "in-progress", "category": "<categoryId>"}'
```

List tasks (public, no token needed):
```bash
curl http://localhost:5000/api/tasks
```

## 10. Verifying persistence across restarts

1. Start the server, create a task via `POST /api/tasks`.
2. Stop the server (`Ctrl+C`).
3. Start it again (`npm start`).
4. `GET /api/tasks` — the task is still there, because it now lives in
   MongoDB, not in a JavaScript array in memory.

This is the behavior to capture in the demo video: create data, kill the
server, restart it, fetch the data again and show it's unchanged.

## 11. Verifying auth is actually enforced

For this task's demo video, show the following sequence:

1. **Signup** — `POST /api/auth/signup`, show the JWT returned.
2. **Login** — `POST /api/auth/login`, show a JWT returned again.
3. **Access a protected route WITH the token** — e.g. `POST /api/tasks` with
   `Authorization: Bearer <token>` — show it succeeds (201).
4. **Access the same route WITHOUT a token** — same request, no
   `Authorization` header — show it's blocked with `401 No token provided`.

Optional extra proof: wait for the token to expire (or set `JWT_EXPIRES_IN`
briefly to something short like `10s` for testing) and show the
`401 Token expired, please log in again` response.

## 12. Verifying validation & graceful error handling

For the validation task's demo video, intentionally break the API and show
it fails gracefully — no crash, no stack trace, no server restart needed:

1. `POST /api/tasks` with an empty body → `400 Validation failed`
2. `POST /api/tasks` with an invalid `status` value → `400 Validation failed`
3. `GET /api/tasks/not-a-real-id` → `400 Validation failed` (invalid ID format)
4. Send genuinely malformed JSON (missing a closing brace) → `400 Malformed JSON in request body`
5. `POST /api/categories` with a `name` that already exists → `409 Duplicate value for name`
6. After all of the above, show the server is still running and a normal
   request (e.g. `GET /api/tasks`) still works fine — proving none of the
   bad input above ever crashed it.

## 13. Verifying filters, sorting & pagination

For this task's demo video:

1. Run `npm run seed` and show the console output confirming 35 tasks were created.
2. `GET /api/tasks?limit=10` — show only 10 of the 35 tasks come back, with
   `pagination.total` showing 35 and `totalPages` showing 4.
3. `GET /api/tasks?page=2&limit=10` — show a different set of 10 tasks, and
   `pagination.page` reflecting 2.
4. `GET /api/tasks?status=completed` — show only completed tasks are returned.
5. `GET /api/tasks?sortBy=dueDate` vs `?sortBy=-dueDate` — show the order
   flips.
6. `GET /api/tasks/:id/comments` on one of the first 10 seeded tasks — show
   the nested comments for that task.
7. Combine several at once, e.g.
   `GET /api/tasks?status=pending&sortBy=-createdAt&page=1&limit=5`, and show
   the response matches all three filters together.

## 11. Testing

The test suite has two layers, kept in separate folders so they can be run
independently:

```
tests/
├── unit/          # pure functions — no DB, no HTTP, run in milliseconds
│   ├── queryHelpers.test.js   # parsePagination() and parseSort()
│   └── signToken.test.js      # JWT generation (controllers/authController.js)
└── integration/   # real HTTP requests through the app, real MongoDB
    └── api.test.js
```

### Running the tests

```bash
npm test              # everything (unit + integration)
npm run test:unit         # just the fast, dependency-free unit tests
npm run test:integration  # just the integration suite (needs MongoDB)
```

Integration tests connect to the **same MongoDB Atlas cluster** configured
in `.env`, but under a separate database name (`task_crud_api_test`) — so
running the suite never touches your real seeded data, even though it
calls `dropDatabase()` in cleanup. Each test file manages its own
connection and cleans up the collections it touched between tests.

### What's covered

**Unit tests** (2 core pieces of logic, 9 tests total):
- `parsePagination()` — defaults, valid input, invalid/non-numeric input,
  and clamping `limit` to a maximum of 100
- `parseSort()` — default sort, ascending, descending (`-` prefix), and
  rejecting fields not on the allow-list
- `signToken()` — payload contains the correct user id/email, expiry is
  set correctly, a token signed with one secret fails verification against
  another, and two different users get two different tokens

**Integration tests** (8 endpoints, happy path + at least one failure case
each, 16 tests total):

| Endpoint | Happy path | Failure case |
|---|---|---|
| `POST /api/auth/signup` | 201, returns a token | 409 duplicate email |
| `POST /api/auth/login` | 200, returns a token | 401 wrong password |
| `POST /api/categories` | 201, category created | 400 missing `name` |
| `POST /api/tasks` | 201, task created with default status | 401 no auth token |
| `GET /api/tasks` | 200, correct `pagination` block | 400 invalid `limit` |
| `PUT /api/tasks/:id` | 200, partial update applied | 404 id doesn't exist |
| `POST /api/tasks/:id/comments` | 201, comment created | 404 task doesn't exist |
| `DELETE /api/comments/:id` | 200, comment deleted (by its author) | 403 not the comment's author |

### What's NOT covered

Being upfront about the gaps:

- **`DELETE /api/categories/:id` and `DELETE /api/tasks/:id`** aren't
  exercised directly by integration tests (their logic — find-by-id,
  404-if-missing, `AppError` — is identical in shape to the covered
  `PUT`/`DELETE` cases above, so the risk is low, but they're not
  independently asserted).
- **`GET /api/tasks/:id`** (single task fetch) and
  **`GET /api/tasks/:id/comments`** (listing comments) aren't directly
  tested, though the data they'd return is exercised indirectly via the
  `POST` tests that read back `res.body.data`.
- **Token expiry behavior** (`401 Token expired, please log in again`) is
  implemented in `middleware/requireAuth.js` but not covered by an
  integration test — it would require either waiting for real expiry or
  mocking `jsonwebtoken`, both intentionally out of scope here.
- **Concurrency / race conditions** (e.g. two simultaneous requests to
  delete the same task) aren't tested.
- **Rate limiting or abuse protection** — there isn't any in this API, so
  there's nothing to test.
- **Load/performance testing** is out of scope; all tests assert
  correctness, not throughput or latency.
- The **`/health`** endpoint isn't covered by an automated test (it's
  simple enough to verify manually with `curl`).

### Video checklist

For this task's demo video:

1. Run `npm test` and show the full suite passing — call out the unit vs.
   integration split in the output.
2. Open `tests/unit/signToken.test.js` and `tests/unit/queryHelpers.test.js`
   briefly — explain these need no database and run instantly.
3. Open `tests/integration/api.test.js` — pick 2–3 `describe` blocks and
   walk through a happy-path test and its paired failure-case test.
4. Walk through this README section by section, pointing out the endpoint
   reference (§8), the validation/error examples (§5), and this testing
   summary (§11) — showing the API is fully documented without needing to
   read the source.

## 12. Deployment

The API is deployed on **Vercel** as a serverless function, with **MongoDB
Atlas** as the database (the same Atlas cluster used in development).

**Live URL:** `https://<your-project-name>.vercel.app` *(replace with your
actual deployment URL after deploying — see step-by-step below)*

**Try it:**
```bash
curl https://<your-project-name>.vercel.app/health
```

### Why Vercel needs a slightly different entry point

Everything in this repo up to this point assumes a normal, always-on
process (`node server.js`), listening on a port forever. Vercel doesn't
work that way — it runs your code as **serverless functions**: a fresh,
short-lived invocation per request (or per small burst of requests on a
"warm" instance), not one long-running process.

That's why there are two entry points:

| File | Used by | What it does |
|---|---|---|
| `server.js` | `npm start`, `npm run dev`, any traditional host (a VM, Render, etc.) | Connects to MongoDB once, then calls `app.listen()` and stays running. |
| `api/index.js` | Vercel only | Runs on every request. Calls `connectDB()` (which skips reconnecting if a connection from a previous warm invocation is already open), then hands the request to the same Express `app`. |
| `vercel.json` | Vercel only | Routes every incoming path to `api/index.js`, so routes like `/health` and `/api/tasks` work exactly as they do locally, instead of only responding under `/api/*`. |

Both entry points import the **same** `app.js` — the actual routes,
validation, and error handling are identical either way. Only how the app
gets connected to and started differs.

### Deploying it yourself

1. **Push this repo to GitHub** (if it isn't already — Vercel deploys from
   a Git repository).
2. **Go to [vercel.com](https://vercel.com)** → sign in → **Add New
   Project** → import this repository.
3. **Environment variables** — in the project's **Settings → Environment
   Variables**, add every variable from `.env.example` with your real
   values:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `DB_CONNECT_RETRIES`
   - `DB_CONNECT_RETRY_DELAY`
   - `LOG_LEVEL` (optional — defaults to `info`)

   Never commit real secrets to the repo — this is exactly what environment
   variables are for. `.env` stays local and is git-ignored; Vercel injects
   these into the deployed function's `process.env` instead.
4. **Deploy.** Vercel auto-detects `api/index.js` as a serverless function
   and applies the rewrites in `vercel.json`. No build step is needed for
   this project (no compiled/bundled TypeScript, no frontend).
5. **Whitelist Vercel's outbound traffic in Atlas** — since Vercel's
   serverless functions don't have a fixed IP, go to Atlas → **Network
   Access** → **Add IP Address** → **Allow Access from Anywhere**
   (`0.0.0.0/0`). This is standard practice for serverless deployments
   (the connection is still authenticated with your real username/password
   — this only affects which IPs are allowed to *attempt* a connection).
6. **Verify:**
   ```bash
   curl https://<your-project-name>.vercel.app/health
   ```
   Should return `{"success":true,"data":{"status":"ok","db":"connected"}}`.

### Keeping the process running / handling crashes

This looks different on Vercel than on a traditional host, and it's worth
being explicit about that instead of glossing over it:

- **On a traditional host** (`npm start`, a VM, Render, etc.): `server.js`
  registers `process.on('uncaughtException', ...)` and
  `process.on('unhandledRejection', ...)` handlers. Every crash is logged
  with full context via the structured logger (§13) before the process
  exits, instead of dying silently. In production you'd normally also run
  this under a process manager (PM2, systemd, or the host's own restart
  policy) so it comes back up automatically after that exit — this repo
  doesn't include one since Vercel doesn't use `server.js` at all.
- **On Vercel:** there's no persistent process to crash. Each invocation
  is isolated — if one request throws an unexpected error, Vercel just
  returns an error for that one invocation and the next request gets a
  brand new, healthy invocation. "Keeping it running" is Vercel's job, not
  ours. What we're still responsible for — and what this repo does — is
  making sure a bad request never returns a broken response: every route
  is wrapped in `asyncHandler`, every thrown error flows through the
  centralized `errorHandler`, and `api/index.js` itself catches a failed
  DB connection and returns a clean `503` instead of letting the
  invocation fail raw.

## 13. Structured Logging

Every log line — for requests and for errors — is a single structured JSON
object (via [pino](https://getpino.io/)), not a free-text `console.log()`.
This is what lets Vercel's log viewer (or any real log aggregator) actually
filter and search logs, instead of just displaying a scrolling wall of text.

### Request logs

Every request produces one JSON log line (via `pino-http`), for example:
```json
{
  "level": 30,
  "time": "2026-09-01T10:22:14.512Z",
  "req": { "id": 42, "method": "GET", "url": "/api/tasks?limit=5" },
  "res": { "statusCode": 200 },
  "responseTime": 18,
  "msg": "request completed"
}
```
The log level is chosen automatically based on the response: `info` for
anything under 400, `warn` for 4xx, `error` for 5xx or a thrown exception —
so scanning logs for `"level":50` instantly surfaces real problems.

### Error logs

Every error caught by the centralized `errorHandler` (§5) is logged with
the same request id as its request log line, plus the full error object
(message and stack trace) — visible server-side only, never sent to the
client:
```json
{
  "level": 50,
  "time": "2026-09-01T10:22:31.009Z",
  "err": { "type": "Error", "message": "Task not found", "stack": "..." },
  "method": "GET",
  "url": "/api/tasks/64f1a2b3c4d5e6f7a8b9c0d1",
  "statusCode": 404,
  "msg": "Request failed"
}
```

### Log level

Controlled by `LOG_LEVEL` (see `.env.example`) — defaults to `info` in
production and `debug` locally. Test runs (`NODE_ENV=test`, set
automatically by Jest) silence per-request auto-logging so `npm test`
output stays readable, while error logging stays fully active.

### Reading logs locally

Structured JSON is great for machines, less pleasant to read by eye while
developing. For a human-readable version while running locally:
```bash
npm run dev:pretty
```

### Reading logs on Vercel

**Vercel Dashboard → your project → Logs** shows every invocation's log
lines in real time, filterable by status code, function, and time range —
this is where `console.log` output would show up too, but structured JSON
lines are what make filtering by status/level actually useful rather than
just scrolling through text.

## 14. Uptime Monitoring

A free [UptimeRobot](https://uptimerobot.com) monitor pings `/health`
every 5 minutes and alerts by email if the API stops responding or starts
returning errors.

**Setting it up:**
1. Create a free account at uptimerobot.com.
2. **Add New Monitor** → Monitor Type: **HTTP(s)**.
3. **URL to monitor:** `https://<your-project-name>.vercel.app/health`
4. **Monitoring interval:** 5 minutes (the free tier's minimum).
5. Add your email under **Alert Contacts** so you're notified on downtime.
6. Save. UptimeRobot will show a live uptime percentage and response-time
   graph on its dashboard, and can also give you an embeddable public
   status-page badge if you want one.

Since `/health` also reports database connectivity
(`{"db":"connected"}` vs `{"db":"disconnected"}`), this monitor catches
both "the deployment is down" and "the deployment is up but can't reach
MongoDB" — two different failure modes that a plain "is the server
responding at all" check would conflate.

### Video checklist (this task)

1. Show `curl https://<your-project-name>.vercel.app/health` returning a
   live, real response — not `localhost`.
2. Hit a couple of real endpoints against the live URL (e.g. sign up, then
   create a task) to show the full deployed API working end to end.
3. Open the Vercel dashboard's **Logs** tab and show the structured JSON
   log lines for those same requests.
4. Show the UptimeRobot dashboard with the `/health` monitor configured
   and reporting "Up".
5. Briefly walk through this README section (§12–14) — deployment steps,
   the two-entry-point explanation, structured logging, and monitoring.
