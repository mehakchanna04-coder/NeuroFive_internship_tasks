# Task CRUD API (MongoDB Edition)

A REST API for managing Tasks, now backed by **MongoDB** instead of in-memory storage.
Tasks can optionally belong to a **Category** — a real reference relationship
(the Mongoose equivalent of a foreign key), so data actually persists across
server restarts.

## Tech stack

- Node.js + Express
- MongoDB + Mongoose
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
```

`.env` is already in `.gitignore` — it will never be committed.

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

## 4. API Endpoints

### Categories
| Method | Route               | Description       |
|--------|---------------------|--------------------|
| GET    | /api/categories      | List all categories |
| POST   | /api/categories      | Create a category   |
| DELETE | /api/categories/:id  | Delete a category    |

### Tasks
| Method | Route          | Description                              |
|--------|----------------|-------------------------------------------|
| GET    | /api/tasks     | List all tasks (filter with `?status=` / `?category=`) |
| GET    | /api/tasks/:id | Get one task                             |
| POST   | /api/tasks     | Create a task                            |
| PUT    | /api/tasks/:id | Update a task                            |
| DELETE | /api/tasks/:id | Delete a task                            |

`GET /health` reports server + DB connection status.

## 5. Example requests

Create a category:
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Work", "description": "Job-related tasks"}'
```

Create a task linked to that category (use the `_id` returned above):
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Finish CRUD assignment", "status": "in-progress", "category": "<categoryId>"}'
```

List tasks:
```bash
curl http://localhost:5000/api/tasks
```

## 6. Verifying persistence across restarts

1. Start the server, create a task via `POST /api/tasks`.
2. Stop the server (`Ctrl+C`).
3. Start it again (`npm start`).
4. `GET /api/tasks` — the task is still there, because it now lives in
   MongoDB, not in a JavaScript array in memory.

This is the behavior to capture in the demo video: create data, kill the
server, restart it, fetch the data again and show it's unchanged.
