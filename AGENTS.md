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
npm run dev
```

This runs both the Next.js server and the worker process concurrently. Ensure Docker is running and the required environment variables are set.

## Database Management

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
- A `.env.local` file is required. Use `.env.example` as a template.
- Key variables:
  - `DATABASE_URL`: Postgres connection URL
  - `AUTH_SECRET`: NextAuth.js secret key
  - `ADMIN_USER` and `ADMIN_PASSWORD`: Default admin credentials
  - `LLM_*` variables: Configure the LLM provider (LiteLLM for dev, Bedrock for prod)

```bash
docker-compose up
```

This sets up the application with Postgres and binds the necessary volumes.

## Core Directories
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