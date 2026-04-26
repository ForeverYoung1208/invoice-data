# Code Style Guide

## TypeScript

- Use `enum` (not union string types) for all finite value sets
- Enum keys are UPPER_SNAKE_CASE; values are lowercase strings
- All enums live in `src/lib/db/enums.ts` — import from there everywhere
- OOP style throughout: use classes, not plain functions, for services and agents
- All files are `.ts` or `.tsx` — no `.js`

## Enums

```typescript
// CORRECT
export enum TaskStatus {
  UPLOADED = "uploaded",
  QUEUED = "queued",
}

// WRONG — union type
type TaskStatus = "uploaded" | "queued";

// WRONG — lowercase keys
export enum TaskStatus {
  uploaded = "uploaded",
}
```

## Modules

- ESM throughout (`import`/`export`), no `require()`
- Path alias `@/*` maps to `src/*`

## TypeORM

- Entities use `@Column({ type: "enum", enum: MyEnum })` for enum columns
- All enums imported from `src/lib/db/enums.ts`
- `DataSource` singleton in `src/lib/db/dataSource.ts`, cached on `global` for HMR safety

## API Documentation

- Every REST route handler must have a JSDoc `@swagger` annotation
- Swagger UI is served at `/api-docs`
- Spec is generated via `next-swagger-doc` from JSDoc annotations

```typescript
/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     responses:
 *       201:
 *         description: Task created
 */
export async function POST(req: Request) { ... }
```

## DI

- All service singletons instantiated in `src/lib/container.ts`
- Services receive dependencies via constructor injection
- Always use TypeScript constructor shorthand for injected dependencies:

```typescript
// CORRECT
constructor(private readonly taskService: TaskService) {}

// WRONG
constructor(taskService: TaskService) {
  this.taskService = taskService;
}
```
