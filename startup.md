# Development Startup Guide

This guide covers the normal workflow for starting and stopping the local development environment.

---

# 1. Start Docker Desktop

Open **Docker Desktop** in Windows and wait until the engine is running.

> **Note**
> Docker must be running before PostgreSQL can start.

---

# 2. Open the Project in WSL

Open Ubuntu or a VS Code WSL terminal.

```bash
cd ~/dev/projects/evolve-martial-arts-client-manager
code .
```

Verify that VS Code shows:

```
WSL: Ubuntu-24.04
```

in the lower-left corner.

---

# 3. Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

Or use the project script:

```bash
pnpm db:up
```

Verify the database is healthy:

```bash
docker compose ps
```

Expected output:

- `evolve-postgres` — **healthy**

---

# 4. Apply Database Migrations

Run migrations every time you start development.

```bash
pnpm db:migrate
```

> **Note**
> Alembic only applies migrations that have not already been run.

---

# 5. Start the Development Servers

If Turborepo is configured:

```bash
pnpm dev
```

This starts:

- **Next.js:** http://localhost:3000
- **FastAPI:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/docs

Stop the development servers with:

```text
Ctrl + C
```

---

# Daily Startup

Most days you'll only need:

```bash
cd ~/dev/projects/evolve-martial-arts-client-manager
code .
pnpm db:up
pnpm db:migrate
pnpm dev
```

---

# If `pnpm dev` Doesn't Start the API

Normally Turborepo starts FastAPI using:

```text
apps/api/.venv/bin/fastapi
```

If necessary, run each application separately.

## Backend

```bash
cd ~/dev/projects/evolve-martial-arts-client-manager/apps/api

source .venv/bin/activate
fastapi dev app/main.py
```

## Frontend

```bash
cd ~/dev/projects/evolve-martial-arts-client-manager

pnpm web:dev
```

---

# Verify Your Environment

Before beginning work, verify the following.

## Node

```bash
node -v
```

## pnpm

```bash
pnpm -v
```

## Docker

```bash
docker compose ps
```

## Python

```bash
apps/api/.venv/bin/python --version
```

## Git

```bash
git status
```

---

# Shutting Down

Stop the development servers:

```text
Ctrl + C
```

You can leave PostgreSQL running, or stop it:

```bash
docker compose stop
```

To remove the container while preserving your database:

```bash
docker compose down
```

⚠️ **Warning**

The following command deletes your local PostgreSQL volume and all local database data.

```bash
docker compose down -v
```

---

# Recommended Daily Workflow

## Startup

```bash
cd ~/dev/projects/evolve-martial-arts-client-manager
code .
pnpm db:up
pnpm db:migrate
pnpm dev
```

## Shutdown

Stop the development servers:

```text
Ctrl + C
```

Optionally stop PostgreSQL:

```bash
pnpm db:down
```

---

# Future Improvement

A useful enhancement would be a single startup script that automatically:

1. Checks Docker Desktop is running
2. Starts PostgreSQL
3. Waits until PostgreSQL is healthy
4. Runs database migrations
5. Starts both the frontend and backend

Example:

```bash
pnpm start
```

This would reduce the entire startup process to a single command.