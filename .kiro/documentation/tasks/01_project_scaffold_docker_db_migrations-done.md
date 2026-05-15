### Task 1: Project scaffold, Docker setup, DB schema & DI container

- **Objective:** Runnable Next.js + Postgres environment with TypeORM entities, migrations, and service container
- **Implementation:** create-next-app --typescript, add typeorm, pg, reflect-metadata, tailwindcss, shadcn/ui init. Entities: User, Task, TaskFile (role enum: jobs/clients/parts/devices), TaskResult, CorrectionLog. DataSource singleton in lib/db/dataSource.ts cached on global. lib/container.ts instantiates and exports all service singletons. Docker Compose: app + postgres, EBS volume at /data. TypeORM CLI migration script
- **Demo:** docker compose up → app starts, DB migrates, /api/health returns 200 with DB ping

## DONE.
Spent: 2h