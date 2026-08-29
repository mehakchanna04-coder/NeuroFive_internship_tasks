curl http://localhost:3001/# CRUD Task API

A lightweight Express API for managing tasks in memory. This project demonstrates the core CRUD operations required for backend development practice.

## Features

- Create a task
- List all tasks
- Get a single task by ID
- Update an existing task
- Delete a task
- Proper HTTP status codes
- Console request logging

## Resource Fields

Each task contains:

- `id`
- `title`
- `description`
- `status`
- `priority`
- `createdAt`

## Tech Stack

- Node.js
- Express.js

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Base URL:
   ```bash
   http://localhost:3000
   ```

> On Windows, the app may automatically choose the next available port if 3000 is already occupied. For example, it may start on `http://localhost:3001`, `http://localhost:3002`, or `http://localhost:3003`.

> In PowerShell, `curl` is usually an alias for `Invoke-WebRequest`. Use `curl.exe` or `Invoke-RestMethod` for API requests.

## API Endpoints

### GET /
Returns basic service info and available endpoints.

### GET /api/tasks
Returns all tasks.

### GET /api/tasks/:id
Returns a single task by ID.

### POST /api/tasks
Creates a new task.

Request example (PowerShell):
```powershell
curl.exe -X POST http://localhost:3003/api/tasks `
  -H "Content-Type: application/json" `
  -d "{\"title\":\"Write project summary\",\"description\":\"Summarize the task and key deliverables.\",\"status\":\"pending\",\"priority\":\"high\"}"
```

Equivalent JSON body:
```json
{
  "title": "Write project summary",
  "description": "Summarize the task and key deliverables.",
  "status": "pending",
  "priority": "high"
}
```

### PUT /api/tasks/:id
Updates an existing task.

### DELETE /api/tasks/:id
Deletes a task by ID.

## Example Responses

### Create task response
```json
{
  "id": "b5d2d479-9121-4d1e-b5c0-77fd19c8272d",
  "title": "Write project summary",
  "description": "Summarize the task and key deliverables.",
  "status": "pending",
  "priority": "high",
  "createdAt": "2026-08-29T12:00:00.000Z"
}
```

### 404 response
```json
{
  "error": "Task not found"
}
```

## Request Logging

The app logs each request with:

- HTTP method
- request path
- response status code
- response time in milliseconds

## Postman Collection

The project includes a Postman collection file for testing the CRUD endpoints.

## Notes

This is an in-memory API, so data resets when the server restarts.
