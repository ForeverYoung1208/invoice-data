<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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

# Custom Skills
To integrate custom skills into OpenCode sessions, add your skill configuration to the appropriate directory. Skills are typically stored in `.kilo/skills/` or similar directories and should include a `SKILL.md` file with a descriptive name and content.

## Skill Configuration Example

### Directory Structure
```
.kilo/skills/your-skill-name/
├── SKILL.md
└── (optional assets or scripts)
```

### SKILL.md Template
```markdown
---
name: your-skill-name
description: A brief description of the skill's purpose.
---

# Skill Name

## Description
Provide a detailed description of what the skill does and how it can be used.

## Setup Instructions
1. **Prerequisites**: List any prerequisites or dependencies.
2. **Installation**: Steps to install or enable the skill.
3. **Usage**: Examples of how to use the skill within OpenCode.

## Examples
Include example commands or scenarios where this skill would be useful.
```

By including this information in `AGENTS.md`, future OpenCode sessions will have a reference for integrating custom skills and understanding the project's configuration and setup.