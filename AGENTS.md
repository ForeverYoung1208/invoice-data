<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# **THIS IS EDUCATIONAL PROJECT** Explain your decisions, patterns, mechanisms regarding next.js and landggrah functionality
User has experience with nest.js and react.js applications and uses this project to study and learn next.js and langGraph usage patterns and best practices. So provide user with explanations of basics of next.js, langGraph interfaces, usage patterns/cases  and architecture decisions.

# The developer uses speech to text system. Keep that in mind and interpret ambiguous phrases by context or if you have doubts it is better to ask user to clarify.

# Application description: ./.kiro/documentation/IDEA.md  - Read it first.

# Progress tracking: ./.kiro/documentation/PROGRESS.md - Use it when you need to read or update progress.

# Tasks: ./.kiro/documentation/tasks/* - Use them to get task and write results of the task completion.

 
# For Code style rules see file .kiro/steering/CODESTYLE.md
** Before making any changes check `.kiro/steering/CODESTYLE.md`  file and follow it.**

## Project Structure Overview

The project follows a typical Next.js/TypeORM structure with the following key directories:

### `src/`
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

### `tests/`
**Test suite**
- Contains Playwright and Jest test files
- Organized by feature (task detail, file upload, task list)
- Includes test data and fixtures

### `worker/`
**Background processing**
- Contains worker service implementation
- Polling loop and status management
- Integration with task processing system

### `public/`
**Static assets**
- Contains static files served by Next.js

### `docker/`
**Infrastructure**
- Docker Compose configuration
- Postgres data volume setup
- Application service definitions

### Configuration Files
- `.env.example` - Environment variable template
- `docker-compose.yml` - Container orchestration
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration

### Testing Infrastructure
- `playwright.config.ts` - Playwright configuration
- `jest.config.ts` - Jest configuration
- `tests/` directory contains:
  - E2E tests (Playwright)
  - Unit tests (Jest)
  - API tests
  - Component tests

# Key Procedures
## Run the Application
**Note:** Application could be already started by the user (check localhost:3000)
use `docker compose` to start application containers,
see `docker-compose.yml` for container configuration details.


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

## Build and Test
see package.json for available scripts
