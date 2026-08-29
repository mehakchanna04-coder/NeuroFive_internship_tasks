# Health Check API

A very small Express application that exposes a `/health` endpoint for monitoring.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Check the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

## Endpoints

- `GET /health` — returns JSON with service health, uptime, and timestamp
- `GET /` — returns a simple root message

## Example Response

```json
{
  "status": "ok",
  "uptime": 12.345,
  "timestamp": "2026-08-29T12:00:00.000Z"
}
```
