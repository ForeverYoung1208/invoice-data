<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# For Code style rules see file .kiro/steering/CODESTYLE.md
Before making any changes check that you read code style file and follow it.
 
# Key Procedures
## Run the Application

Use the following command to start the development server:
```bash
npm run app:dev > dev.log 2>&1 &

> **Note:** This non-blocking startup with log capture is required for AI agents to maintain continuous operation and enable real-time monitoring through `dev.log`
```

This runs both the Next.js server and the worker process concurrently. Ensure Docker is running and the required environment variables are set.

### UI Testing
Do not use headed browsers, only use headless mode.
To perform UI checks or create UI tests:
1. **Write tests** in the `tests/` directory (e.g., `tests/login.test.ts`).
2. **Run tests** using:
   ```bash
   npx playwright test tests/<test-file>.ts --browser chromium
   ```
   Test automatically runs in headless mode (required for containers) and creates screenshot.

### Start Application
Use the following command to start the development server:
```bash
npm run app:dev > dev.log 2>&1 &

> **Note:** This non-blocking startup with log capture is required for AI agents to maintain continuous operation and enable real-time monitoring through `dev.log`
```

This runs both the Next.js server and the worker process concurrently. Ensure Docker is running and the required environment variables are set.

Check log file `dev.log` to ensure that application is running.

## Searching for files, patterns, etc
- search only within current project's folder and in nested folders, never search in ther directory tree above/outside of current project folder without direct permission;
- exclude docker/postgres/data and docker/app-files/data folders;
- search only within current project's folder and in nested folders, never search in ther directory tree above/outside of current project folder without direct permission;
- exclude docker/postgres/data and docker/app-files/data folders;

## Database Management

**IMPORTANT: NEVER perform destructive database operations without explicit permission**
- NEVER DELETE, DROP, TRUNCATE, or modify any database data without direct explicit permission for each operation
- Always ask for permission before running any SQL commands that change or delete data
- This includes but is not limited to: DELETE, DROP, TRUNCATE, UPDATE (unless specifically approved)

### Migrations
- Generate a new migration:
  ```bash
  npm run migration:generate -- -n MigrationName
  ```
- Run migrations:
  ```bash
  npm run migration:run
  ```
- Revert the last migration:
  ```bash
  npm run migration:revert
  ```

### Seeding
Seed the database with initial data using:
```bash
npm run db:seed
```

## Environment Setup
- A `.env` file is required. Use `.env.example` as a template.
- Key variables:
  - `DATABASE_URL`: Postgres connection URL
  - `AUTH_SECRET`: NextAuth.js secret key
  - `ADMIN_USER` and `ADMIN_PASSWORD`: Default admin credentials
  - `LLM_*` variables: Configure the LLM provider (LiteLLM for dev, Bedrock for prod)

```bash
docker compose up
```

This sets up the application with Postgres and binds the necessary volumes.

## Core Directories
- `src/lib/db/entities`: TypeORM entities
- `src/lib/services`: Business logic and service classes
- `src/app/api`: Next.js API routes
- `worker`: Background task processing
- `tests/`: UI and API test files (Playwright, Jest, etc.)
- `src/lib/db/entities`: TypeORM entities
- `src/lib/services`: Business logic and service classes
- `src/app/api`: Next.js API routes
- `worker`: Background task processing

## Build and Test
- Linting:
  ```bash
  npm run lint
  ```
- Production build:
  ```bash
  npm run build
  ```
- Start in production mode:
  ```bash
  npm start
  ```

# Impotant!
- Never execute  `$ docker stop $(docker ps -q)` because it will stop all containers including dev container where coding agent is running!
- If you need to stop and start containers use the following commands:
  ```bash
  docker compose stop <container_name>
  docker compose start <container_name>
  ```
  where `<container_name>` is the name of the container you want to stop and start.