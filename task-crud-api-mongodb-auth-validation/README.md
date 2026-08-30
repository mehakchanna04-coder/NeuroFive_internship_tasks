# Task CRUD API (MongoDB + JWT Auth Edition)

A REST API for managing Tasks, backed by **MongoDB** instead of in-memory
storage, with **JWT-based authentication** protecting all write operations.
Tasks can optionally belong to a **Category** — a real reference relationship
(the Mongoose equivalent of a foreign key), so data actually persists across
server restarts.

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

Each Task optionally references one Category (`ref: 'Category'`), and
`GET` requests populate the category's `name`/`description` inline — this is
the relationship the assignment asks for.

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

## 6. API Endpoints

### Categories
| Method | Route               | Auth required | Description       |
|--------|---------------------|:--------------:|--------------------|
| GET    | /api/categories      | No             | List all categories |
| POST   | /api/categories      | Yes            | Create a category   |
| DELETE | /api/categories/:id  | Yes            | Delete a category    |

### Tasks
| Method | Route          | Auth required | Description                              |
|--------|----------------|:--------------:|-------------------------------------------|
| GET    | /api/tasks     | No             | List all tasks (filter with `?status=` / `?category=`) |
| GET    | /api/tasks/:id | No             | Get one task                             |
| POST   | /api/tasks     | Yes            | Create a task                            |
| PUT    | /api/tasks/:id | Yes            | Update a task                            |
| DELETE | /api/tasks/:id | Yes            | Delete a task                            |

`GET /health` reports server + DB connection status.

## 7. Example requests

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

## 8. Verifying persistence across restarts

1. Start the server, create a task via `POST /api/tasks`.
2. Stop the server (`Ctrl+C`).
3. Start it again (`npm start`).
4. `GET /api/tasks` — the task is still there, because it now lives in
   MongoDB, not in a JavaScript array in memory.

This is the behavior to capture in the demo video: create data, kill the
server, restart it, fetch the data again and show it's unchanged.

## 9. Verifying auth is actually enforced

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

## 10. Verifying validation & graceful error handling

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
