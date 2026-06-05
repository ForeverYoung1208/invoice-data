# Code Style Guide

## TypeScript

- Use `enum` (not union string types) for all finite value sets
- Enum keys are UPPER_SNAKE_CASE; values are lowercase strings
- OOP style throughout: use classes, not plain functions, for services and agents
- All files are `.ts` or `.tsx` — no `.js`

## Enums

Enums use an uppercase `E` prefix (e.g. `ETaskStatus`, `ETaskFileRole`). Enum keys are UPPER_SNAKE_CASE; values are lowercase strings. These enums are the single source of truth — never use raw strings like `'queued'` in code, always reference the enum member.
Enums are defined in `src/lib/constants.ts`.

```typescript
// CORRECT
export enum ETaskStatus {
  UPLOADED = "uploaded",
  QUEUED = "queued",
}

// WRONG — union type
type TaskStatus = "uploaded" | "queued";

// WRONG — lowercase keys
export enum ETaskStatus {
  uploaded = "uploaded",
}
```

## Modules

- ESM throughout (`import`/`export`), no `require()`
- Path alias `@/*` maps to `src/*`

## TypeORM

- Entities use `@Column({ type: "enum", enum: MyEnum })` for enum columns
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

## Shared Zod API DTO Contracts

All API boundaries between backend routes and frontend fetch helpers must be validated with **shared Zod schemas**.

**Directory:** `src/lib/contracts/schemas/`

**Structure:**
- `common.schema.ts` — shared types (e.g., `csvRowSchema`, `csvRowsSchema`)
- `task.schema.ts` — task-domain schemas, organized with comments:
  - `/** API→UI */` section — schemas for route responses
  - `/** UI→API */` section — schemas for mutation request bodies

**Naming conventions:**
- Schema: `taskDetailSchema`, `taskFileSchema`, `csvRowSchema`
- Inferred DTO type: `TTaskDetailDto`, `TTaskFileDto`, `TCsvRow` (prefix with `T` for types)

**Usage:**
1. Define Zod schemas that mirror the API response/request shape.
2. Infer TypeScript types via `z.infer<typeof schema>`.
3. In route handlers, construct the response object with the inferred type and pass it to `NextResponse.json()`.
4. In client fetch helpers, call `.parse()` on `res.json()` to validate at the HTTP boundary.
5. API should validate incoming request bodies with Zod schemas before processing.

## Server State Management

### TanStack Query

Replace all manual `useEffect` + `useState` data-fetching patterns with **TanStack Query**.

**Provider setup:**
- Create `src/components/providers/query-provider.tsx` wrapping the app body in `layout.tsx`.
- Use `useState` to create a single stable `QueryClient` instance:

```ts
const [queryClient] = useState(() => new QueryClient());
```

**Query pattern (server data):**

```ts
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['task', taskId],
  queryFn: () => fetchTaskDetail(taskId),
});
```

**Derived state:** Never store server data in `useState`. Derive UI values from `data`:

```ts
const task = data
  ? { id: data.id, status: data.status, ... }
  : null;
```

Remove local states for `task`, `result`, `files`, `corrections`, `loading`, `error` — keep only **UI-only** state (`correctionText`, `activeTab`).

**Mutations:**

```ts
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: async (body) => { /* fetch POST/PATCH */ },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  },
});
```

**`useQueries`** for multiple concurrent requests (e.g., per-file loading):

```ts
const fileQueries = useQueries({
  queries: files.map((file) => ({
    queryKey: ['task-file', taskId, file.id],
    queryFn: () => fetchTaskFileRows(taskId, file.id),
  })),
});
```

### Client Fetch Helpers

**Directory:** `src/lib/client/`

Create separate helper files for each domain:
- `task-detail-api.ts` — task-detail and task file row fetching
- `file-data-api.ts` — file-specific fetching

**Rules:**
- Helpers must **throw** on non-OK responses (TanStack Query uses thrown errors for `isError`).
- Validate responses with Zod schema `.parse()` before returning.

## Date Formatting

- Use **dayjs** (not `new Date().toLocaleString`) for date formatting.
- Import date format constants from `src/lib/constants.ts`.

## Type Annotations

- Function parameters and returns must have explicit types.
- Prefer `Record<string, string>[]` over `Record<string, any>[]` when applicable.

Example:

```ts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> { ... }
```
