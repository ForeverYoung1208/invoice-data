<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Application description: ./.kiro/documentation/IDEA.md  - Read it first.


# Progress tracking: ./.kiro/documentation/PROGRESS.md - Use it when you need to read or update progress.

# Tasks: ./.kiro/documentation/tasks/* - Use them to get task and write results of the task completion.

 
# For Code style rules see file .kiro/steering/CODESTYLE.md
Before making any changes check that you read code style file and follow it.

## Project Structure Overview

The project follows a typical Next.js/TypeORM structure with the following key directories:

### 📁 `src/`
**Core application code**
- `app/`
  - `api/`
    - Authentication endpoints (`auth/[...nextauth]`)
    - API routes (`health`, `tasks`, etc.)
  - `dashboard/`
    - Task management UI components
    - Task detail page (`[id]`)
    - File upload interface
  - `login/`
    - Authentication pages
- `components/`
  - UI components
  - `ui/` for shared UI elements
- `lib/`
  - `db/`
    - `entities/` (TypeORM entity definitions)
    - `migrations/` (database migration files)
  - `services/` (business logic/services)

### 📁 `tests/`
**Test suite**
- Contains Playwright and Jest test files
- Organized by feature (task detail, file upload, task list)
- Includes test data and fixtures

### 📁 `worker/`
**Background processing**
- Contains worker service implementation
- Polling loop and status management
- Integration with task processing system

### 📁 `public/`
**Static assets**
- Contains static files served by Next.js

### 📁 `docker/`
**Infrastructure**
- Docker Compose configuration
- Postgres data volume setup
- Application service definitions

### 📄 Configuration Files
- `.env.example` - Environment variable template
- `docker-compose.yml` - Container orchestration
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration

### 🧪 Testing Infrastructure
- `playwright.config.ts` - Playwright configuration
- `jest.config.ts` - Jest configuration
- `tests/` directory contains:
  - E2E tests (Playwright)
  - Unit tests (Jest)
  - API tests
  - Component tests

### 📁 `node_modules/`
**Dependencies**
- Contains all npm packages
- Includes Next.js, TypeORM, NextAuth.js, and other dependencies

 
# Key Procedures
## Run the Application

Use the following command to start the development server:
```bash
npm run app:dev > dev.log 2>&1 &

> **Note:** This non-blocking startup with log capture is required for AI agents to maintain continuous operation and enable real-time monitoring through `dev.log`
```

This runs both the Next.js server and the worker process concurrently. Ensure Docker is running and the required environment variables are set.

### Start Application
Application could be already started by the user (check localhost:3000)
If application isn't started use the following command to start the development server:
```bash
npm run app:dev > dev.log 2>&1 &

> **Note:** This non-blocking startup with log capture is required for AI agents to maintain continuous operation and enable real-time monitoring through `dev.log`
```

This runs both the Next.js server and the worker process concurrently. Ensure Docker is running and the required environment variables are set.


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

