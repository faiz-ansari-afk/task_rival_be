# Task Manager — Backend

REST API for the task management application. Node.js, Express, TypeScript, PostgreSQL (raw SQL via `pg`, no ORM).

## Stack

- Express 4 + TypeScript
- PostgreSQL (node-postgres / `pg`)
- JWT auth (access + refresh tokens, httpOnly cookies) with bcrypt password hashing
- Cloudinary for task attachment storage, via `multer` (in-memory) + the Cloudinary Node SDK
- Zod for request validation
- Jest + Supertest for tests

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or accessible via `DATABASE_URL`)
- A Cloudinary account (free tier is fine) — needed only for the attachments feature; everything else works without it as long as the env vars below are set to *something* (even placeholders), since the app validates their presence at startup but only calls Cloudinary when a file is actually uploaded

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the database and a user (skip if you already have a Postgres role/db):

   ```sql
   CREATE USER taskapp WITH PASSWORD 'taskapp_dev_pw' CREATEDB;
   CREATE DATABASE taskmanager OWNER taskapp;
   CREATE DATABASE taskmanager_test OWNER taskapp;
   ```

3. Copy the environment file and adjust if needed:

   ```bash
   cp .env.example .env
   ```

4. Run migrations:

   ```bash
   npm run migrate
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   The API runs on `http://localhost:8080` by default. Check `GET /health`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server (`dist/server.js`) |
| `npm run migrate` | Apply pending SQL migrations from `src/db/migrations` |
| `npm test` | Run the Jest/Supertest suite against `taskmanager_test` |

## Environment variables

See `.env.example`. `DATABASE_URL` and `JWT_SECRET` are required; everything else has a sensible default.

## API overview

All `/tasks` routes require an `Authorization: Bearer <token>` header (or the `accessToken` cookie set on login/signup).

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Create an account, returns user + access token, sets cookies |
| POST | `/auth/login` | Log in, returns user + access token, sets cookies |
| POST | `/auth/refresh` | Exchange the refresh cookie for a new access token |
| POST | `/auth/logout` | Clear auth cookies |
| GET | `/auth/me` | Return the current authenticated user |

### Tasks

| Method | Path | Description |
|---|---|---|
| POST | `/tasks` | Create a task |
| GET | `/tasks` | List the current user's tasks. Supports `status`, `search`, `sortBy` (`dueDate`\|`priority`\|`createdAt`), `sortOrder` (`asc`\|`desc`), `page`, `limit`. Admins can pass `scope=all` to see every user's tasks. |
| GET | `/tasks/:id` | Fetch a single task (must be owned by the caller, or caller is an admin) |
| PATCH | `/tasks/:id` | Partially update a task |
| DELETE | `/tasks/:id` | Delete a task |
| GET | `/tasks/:id/activity` | List the change history for a task |

### Attachments

All routes below require auth and require the caller to own the parent task (or be an admin). Files are stored on Cloudinary; only the Cloudinary URL and metadata are kept in Postgres.

| Method | Path | Description |
|---|---|---|
| POST | `/tasks/:taskId/attachments` | Upload one or more files (multipart field name `files`, up to 5 per request) |
| GET | `/tasks/:taskId/attachments` | List a task's attachments |
| DELETE | `/tasks/:taskId/attachments/:attachmentId` | Delete an attachment (removes it from Cloudinary too) |

Limits (overridable via env vars): 10MB per file, 5 files per upload request, 10 attachments per task. Allowed types: PNG/JPEG/GIF/WEBP/SVG images, PDF, Word/Excel docs, plain text, CSV.

### Error shape

All errors return:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

## Data model

- `users (id, email, password_hash, role, created_at, updated_at)` — `role` is `USER` or `ADMIN`
- `tasks (id, title, description, status, priority, due_date, user_id, created_at, updated_at)`
- `activity_logs (id, task_id, user_id, action, changes, created_at)` — append-only history of task changes

## Notes on design choices

- Raw SQL via `pg` instead of an ORM — keeps the query layer explicit and avoids binary-engine downloads (Prisma's engine fetch is blocked in some sandboxed/offline environments). Migrations are plain `.sql` files tracked in a `schema_migrations` table.
- Ownership checks return `404` rather than `403` for resources the caller doesn't own, to avoid leaking which IDs exist.
- Refresh tokens are httpOnly cookies; the access token is also returned in the JSON body so SPA clients that prefer header-based auth can use it directly.
