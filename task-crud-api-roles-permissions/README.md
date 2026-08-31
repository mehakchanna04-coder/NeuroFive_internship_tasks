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
- multer for file uploads
- Jest + Supertest + mongodb-memory-server for automated tests
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

## 5. Roles & Permissions

Every user has a `role`: either `"user"` (default) or `"admin"`. Roles are
never settable through public signup — the only way to become an admin is
for an existing admin to promote another user via
`PATCH /api/users/:id/role`. This prevents anyone from self-promoting.

### Permission model

| Action                              | Who can do it                          |
|---------------------------------------|-------------------------------------------|
| Create/update/delete your own task    | Any authenticated user                   |
| Update/delete someone else's task     | Admins only                              |
| Create/delete a category              | Admins only (categories are shared/system-level, not personal) |
| Delete your own comment               | Any authenticated user                   |
| Delete someone else's comment         | Admins only                              |
| List all users                        | Admins only                              |
| Change a user's role                  | Admins only                              |
| Delete a user account                 | Admins only                              |

### 401 vs 403 — the distinction this task asks for

- **401 Unauthorized** — "I don't know who you are." No token, an expired
  token, or an invalid token. Fixable by logging in.
- **403 Forbidden** — "I know exactly who you are, and the answer is no."
  A perfectly valid, logged-in user who simply isn't allowed to do this
  specific thing. Not fixable by logging in again — they'd need a
  different role.

`middleware/requireRole.js` is what enforces this: it runs after
`requireAuth` (so `req.user` is already populated) and returns 403, never
401, when the role doesn't match.

### Admin endpoints

| Method | Route                     | Description                        |
|--------|-----------------------------|---------------------------------------|
| GET    | /api/users                  | List all users (paginated)         |
| PATCH  | /api/users/:id/role         | Change a user's role (`{"role":"admin"}` or `{"role":"user"}`) |
| DELETE | /api/users/:id              | Delete any user's account          |

### Example: role restriction in action

```bash
# Regular user tries to create a category → blocked
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer <regular-user-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Work"}'
# → 403 { "success": false, "error": "Forbidden: this action requires one of these roles: admin" }

# Same request, admin token → succeeds
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Work"}'
# → 201, category created
```

### Promoting a user to admin (for local testing)

There's no API endpoint to become the *first* admin (by design — nothing
public should be able to grant itself admin). For local development, either:

- Run `npm run seed`, which creates a demo admin account
  (`seed.admin@example.com` / `seedpassword123`) alongside a demo regular
  user, **or**
- Manually flip a user's role directly in the database once, e.g. via
  `mongosh`:
  ```js
  use task_crud_api
  db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
  ```
  From then on, that admin can promote others through the API normally.

## 6. Validation & Error Handling

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

## 7. Filtering, Sorting & Pagination

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

## 8. Seeding sample data

To actually test pagination and filtering, seed the database with 35 sample
tasks across 5 categories (plus a handful of comments):

```bash
npm run seed
```

This **clears existing Tasks, Categories, and Comments** (but not Users, so
your login stays intact) and creates fresh sample data. If no user account
exists yet, it also creates a demo login: `seed.user@example.com` /
`seedpassword123`, used to author the sample comments.

## 9. File Uploads (profile pictures)

Authenticated users can upload a profile picture. Files are validated and
stored **locally** on disk, served as static assets with a public URL, and
linked back to the user's record in MongoDB.

### Validation rules

| Rule            | Limit                                  |
|------------------|------------------------------------------|
| Allowed types    | JPEG, PNG, WebP (`image/jpeg`, `image/png`, `image/webp`) |
| Max file size    | 2MB                                     |
| Field name       | `profilePicture` (multipart form field) |
| Max files        | 1 per request                           |

Files are renamed on save (`<userId>-<timestamp>-<random>.<ext>`) — the
original filename is never trusted or used directly, which avoids path
traversal and collisions.

### Endpoint

| Method | Route                          | Auth required | Description                     |
|--------|----------------------------------|:--------------:|-----------------------------------|
| POST   | /api/users/me/profile-picture    | Yes            | Upload/replace your profile picture |
| GET    | /api/users/me                    | Yes            | Get your own user record (incl. `profilePictureUrl`) |

### Example: upload with curl

```bash
curl -X POST http://localhost:5000/api/users/me/profile-picture \
  -H "Authorization: Bearer <token>" \
  -F "profilePicture=@/path/to/photo.jpg"
```

Response:
```json
{
  "success": true,
  "data": {
    "profilePictureUrl": "/uploads/profile-pictures/64f...-1730000000000-a1b2c3.jpg",
    "user": { "id": "64f...", "email": "you@example.com" }
  }
}
```

The returned `profilePictureUrl` is served statically — open it directly
in a browser at `http://localhost:5000/uploads/profile-pictures/<filename>`
to view the uploaded image.

### Error handling for bad uploads

| Situation                     | Status | Response                                                     |
|---------------------------------|:------:|------------------------------------------------------------------|
| No file attached                | 400    | `{ "success": false, "error": "No file uploaded. Attach a file under the field name \"profilePicture\"." }` |
| File over 2MB                   | 400    | `{ "success": false, "error": "File is too large. Maximum size is 2MB." }` |
| Wrong file type (e.g. a .pdf or .txt) | 400 | `{ "success": false, "error": "Unsupported file type. Allowed types: image/jpeg, image/png, image/webp" }` |
| Wrong form field name            | 400    | `{ "success": false, "error": "Unexpected file field \"...\". Use field name \"profilePicture\"." }` |
| No auth token                    | 401    | `{ "success": false, "error": "No token provided" }` |

If the file is saved to disk but the database update fails for any reason,
the server automatically deletes the orphaned file rather than leaving it
on disk with nothing pointing to it.

## 10. API Endpoints

### Categories
| Method | Route               | Auth required | Description       |
|--------|---------------------|:--------------:|--------------------|
| GET    | /api/categories      | No             | List all categories |
| POST   | /api/categories      | Admin only     | Create a category   |
| DELETE | /api/categories/:id  | Admin only     | Delete a category    |

### Tasks
| Method | Route          | Auth required        | Description                              |
|--------|----------------|:-----------------------:|-------------------------------------------|
| GET    | /api/tasks     | No                     | List tasks — supports `?status=`, `?category=`, `?sortBy=`, `?page=`, `?limit=` |
| GET    | /api/tasks/:id | No                     | Get one task                             |
| POST   | /api/tasks     | Yes                    | Create a task (you become its owner)     |
| PUT    | /api/tasks/:id | Yes, owner or admin    | Update a task                            |
| DELETE | /api/tasks/:id | Yes, owner or admin    | Delete a task                            |

### Comments (nested under Tasks)
| Method | Route                        | Auth required        | Description                                  |
|--------|-------------------------------|:-----------------------:|------------------------------------------------|
| GET    | /api/tasks/:id/comments       | No                     | List comments for a task — supports `?sortBy=`, `?page=`, `?limit=` |
| POST   | /api/tasks/:id/comments       | Yes                    | Add a comment to a task                       |
| DELETE | /api/comments/:id             | Yes, author or admin   | Delete a comment                              |

### Users
| Method | Route                          | Auth required | Description                     |
|--------|----------------------------------|:--------------:|-----------------------------------|
| GET    | /api/users/me                    | Yes            | Get your own user record        |
| POST   | /api/users/me/profile-picture    | Yes            | Upload/replace your profile picture |
| GET    | /api/users                       | Admin only     | List all users                  |
| PATCH  | /api/users/:id/role              | Admin only     | Change a user's role            |
| DELETE | /api/users/:id                   | Admin only     | Delete any user's account       |

`GET /health` reports server + DB connection status.

## 11. Example requests

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

## 12. Verifying persistence across restarts

1. Start the server, create a task via `POST /api/tasks`.
2. Stop the server (`Ctrl+C`).
3. Start it again (`npm start`).
4. `GET /api/tasks` — the task is still there, because it now lives in
   MongoDB, not in a JavaScript array in memory.

This is the behavior to capture in the demo video: create data, kill the
server, restart it, fetch the data again and show it's unchanged.

## 13. Verifying auth is actually enforced

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

## 14. Verifying validation & graceful error handling

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

## 15. Verifying filters, sorting & pagination

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

## 16. Verifying file uploads

For the file upload task's demo video:

1. `POST /api/auth/login` to get a token (or reuse one).
2. `POST /api/users/me/profile-picture` with a real image file attached
   under the `profilePicture` field and the token in the `Authorization`
   header — show the `201`/`200` response with the returned
   `profilePictureUrl`.
3. Open that URL directly in a browser (e.g.
   `http://localhost:5000/uploads/profile-pictures/<filename>`) — show the
   uploaded image actually displays.
4. `GET /api/users/me` — show `profilePictureUrl` is now saved on the user
   record in the database, not just returned once and forgotten.
5. Try uploading a file over 2MB — show it's rejected with a clear error,
   not a crash.
6. Try uploading a non-image file (e.g. a `.pdf` or `.txt`) — show it's
   rejected with a clear "unsupported file type" error.
7. Try the upload without an `Authorization` header — show it's blocked
   with `401 No token provided`.

## 17. Automated tests (role restrictions)

`tests/roles.test.js` contains 8 automated test scenarios proving the
permission model actually works, using Jest, Supertest, and an in-memory
MongoDB (`mongodb-memory-server` — no separate test database setup needed,
and it never touches your real data).

```bash
npm test
```

What it proves:

1. A regular user is blocked (`403`) from creating a category.
2. An admin **can** create a category — same endpoint, different result.
3. A user cannot delete another user's task (`403`, ownership check).
4. The task owner **can** delete their own task.
5. An admin **can** delete another user's task (admin override).
6. An unauthenticated request gets `401`, not `403` — proving the
   distinction between "who are you" and "not allowed" is real, not just
   documented.
7. A regular user is blocked (`403`) from listing all users.
8. An admin **can** list all users.

The first download of the test run pulls a small MongoDB binary
(`mongodb-memory-server` does this automatically); this needs a normal
internet connection but not Atlas, so it's unaffected by any SRV-DNS
network issues you may have run into with Atlas elsewhere in this project.

## 18. Verifying role restrictions (demo video)

For this task's demo video, show the same action attempted by both roles:

1. Run `npm run seed` — note the demo admin (`seed.admin@example.com` /
   `seedpassword123`) and demo regular user (`seed.user@example.com` /
   `seedpassword123`) it creates.
2. Log in as the **regular user**, try `POST /api/categories` — show it's
   blocked with `403 Forbidden`.
3. Log in as the **admin**, make the exact same request — show it
   succeeds with `201`.
4. As the regular user, try to delete one of the admin's tasks (or any
   task you don't own) — show `403`.
5. As the admin, delete that same task — show it succeeds.
6. Optionally, run `npm test` on camera and show all 8 scenarios passing.
