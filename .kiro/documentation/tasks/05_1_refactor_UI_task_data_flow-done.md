### Task 5.1: Refactor task-detail UI data flow with TanStack Query

- **Objective:** Replace manual `useEffect`/`useState` server-data fetching on the task detail screen with TanStack Query, centralize CSV file loading/parsing, and remove tab-order-dependent data behavior before implementing the LangGraph pipeline.
- **Implementation:** Add the TanStack Query provider at the application/client boundary, introduce shared Zod-backed API DTO contracts and typed query helpers for task detail and task file content, refactor `/dashboard/task/[id]` so task metadata, files, results, and corrections come from query state, and make the Results and Files tabs share cached file data through stable query keys.
- **Demo:** Opening an existing task directly on the Results tab shows the jobs source data without requiring the user to visit the Files tab first. Visiting Files first or Results first produces the same loaded data, with no duplicate ownership of file content state.

---

## Why this task exists

The project plan says server state should be managed with TanStack Query, while local `useState` should be reserved for local UI state. The current task-detail page still manually fetches server data in `useEffect` and distributes the response into multiple local state variables.

That was acceptable scaffold code, but it becomes risky before Task 6 because task status, result JSON, files, corrections, and generated output will start changing asynchronously once the worker and LangGraph pipeline are connected.

The current issue observed in the UI is a symptom of that architectural mismatch: the Results tab may not show source data for an existing task until the Files tab has been visited. Tabs should not depend on each other for loading shared server data.

---

## Current problems

- `src/app/dashboard/task/[id]/page.tsx` manually fetches task detail data with `useEffect`.
- Task metadata, result JSON, files, and corrections are split into separate local `useState` values even though they come from one server response.
- `JobsSourceDataView` fetches file content independently.
- `FilesTab` also fetches file content independently.
- `JobsSourceDataView` and `FilesTab` duplicate CSV parsing logic.
- File data is owned by nested tab components instead of being represented as shared server state.
- Results and Files tabs can end up depending on render/mount order instead of stable query cache state.
- There are two overlapping file-read APIs:
  - `/api/files/{fileId}` returns raw file content.
  - `/api/tasks/{id}/files/{fileId}` returns parsed CSV rows.

---

## Desired data ownership model

Use TanStack Query for server state:

- `['task', taskId]` — task metadata, task files, latest result, corrections.
- `['task-file', taskId, fileId]` — parsed content for a specific task file.

Use React local state only for UI state:

- active tab
- correction textarea text
- transient dialog/open state
- temporary client-only filters or table controls

Do not store server-derived data in local state unless there is a specific optimistic update reason.

---

## Decomposition into Subtasks

### Subtask 5.1.1 — Add TanStack Query provider

**Goal:** Make TanStack Query available to Client Components.

**What to do:**

- Add a client-side provider component, for example `src/components/providers/query-provider.tsx`.
- Instantiate a `QueryClient`.
- Wrap the app with the provider from a Next.js-compatible client boundary.
- Keep the root layout itself as a Server Component unless a small client provider wrapper is needed.

**Why:** In Next.js App Router, layouts are Server Components by default. React Query needs a Client Component provider because it uses client-side state, effects, and cache management.

---

### Subtask 5.1.2 — Create typed API/query helpers

**Goal:** Move raw fetch logic out of page and tab components.

**What to do:**

- Create a small client-safe query helper module for task-detail data.
- Define TypeScript interfaces for:
  - task detail API response
  - task file item
  - correction item
  - parsed CSV row
- Add `fetchTaskDetail(taskId)`.
- Add `fetchTaskFileRows(taskId, fileId)`.
- Ensure failed HTTP responses throw errors so TanStack Query can set `isError`.

**Why:** Components should describe what data they need, not repeat fetch/error boilerplate.

---

### Subtask 5.1.3 — Add shared Zod API DTO contracts

**Goal:** Keep backend route responses and frontend fetch helpers aligned with the same validated API contract.

**What to do:**

- Define shared Zod schemas for task-detail and task-file responses in a client-safe contract module.
- Infer TypeScript DTO types from those schemas instead of manually duplicating matching interfaces.
- Validate route-handler response payloads before returning JSON where practical.
- Validate `fetchTaskDetail(taskId)` and `fetchTaskFileRows(taskId, fileId)` responses after `res.json()`.
- Add schemas incrementally alongside API development instead of treating validation as a separate later task.

**Why:** TypeScript checks only the code being compiled; it does not prove that JSON crossing an HTTP boundary has the expected shape. Zod makes the API boundary explicit and catches drift such as misspelled fields, missing dates, wrong enum values, or changed nested result structures.

---

### Subtask 5.1.4 — Choose one file-content API contract

**Goal:** Remove duplicated file loading/parsing behavior.

**What to do:**

- Prefer `/api/tasks/{id}/files/{fileId}` for task-detail UI because it verifies the file belongs to the task and returns parsed rows.
- Keep `/api/files/{fileId}` only if another screen still needs raw text content.
- If both routes remain, document their different purposes clearly.
- Avoid parsing CSV separately in `JobsSourceDataView` and `FilesTab`.

**Why:** Parsed CSV rows are server state for this UI. The UI should not parse the same file differently in different tabs.

---

### Subtask 5.1.5 — Refactor task detail page

**Goal:** Replace manual task-detail fetching with a single task query.

**What to do:**

- Replace the `useEffect` task loader with `useQuery({ queryKey: ['task', taskId], queryFn })`.
- Derive display values from query data during render.
- Keep `activeTab` and `correctionText` as local `useState`.
- Use query loading/error states instead of manual `loading` and `error` state.
- Use query invalidation after mutations that change task status or corrections.

**Why:** Task detail data is server state. TanStack Query should own its lifecycle, cache, loading state, error state, and refresh behavior.

---

### Subtask 5.1.6 — Refactor Results tab source data loading

**Goal:** Make source jobs data load independently of tab navigation order.

**What to do:**

- Keep identifying the jobs file from task detail query data.
- Pass `taskId` and `jobsFile.id` into `JobsSourceDataView`.
- Inside `JobsSourceDataView`, use `useQuery({ queryKey: ['task-file', taskId, fileId], queryFn })`.
- Render loading, error, empty, and loaded states from the query result.

**Why:** Results should load the jobs source data directly from the shared query cache. It should not depend on the Files tab being mounted first.

---

### Subtask 5.1.7 — Refactor Files tab file loading

**Goal:** Make all file previews use the same file-content query cache.

**What to do:**

- Replace local `contents`, `loading`, and `errors` maps with `useQueries`.
- Use the same `['task-file', taskId, fileId]` query key pattern as `JobsSourceDataView`.
- Render each file card from its corresponding query result.
- Remove duplicated CSV parsing code from `FilesTab`.

**Why:** If Results and Files request the same jobs file, TanStack Query should deduplicate/cache that request. The tab order should not change behavior.

---

### Subtask 5.1.8 — Add mutation invalidation

**Goal:** Make task mutations refresh related server state consistently.

**What to do:**

- Use `useMutation` for correction submission.
- On correction success, invalidate `['task', taskId]`.
- Use `useMutation` for approve/re-run/delete actions if they remain on this screen.
- Invalidate or navigate after mutation success as appropriate.

**Why:** After a mutation, manually patching selected local state is fragile. Query invalidation makes dependent UI refresh from the server.

---

### Subtask 5.1.9 — Verify behavior

**Goal:** Confirm the refactor fixes the observed tab-order issue and does not regress task-detail UI behavior.

**What to do:**

- Open an existing task directly.
- Confirm the Results tab loads jobs source data without visiting Files first.
- Switch to Files and confirm file previews load.
- Switch back to Results and confirm data remains visible.
- Submit a correction and confirm corrections refresh.
- Re-run or approve a task and confirm status refreshes.
- Run relevant lint/test commands if available.

---

## Educational Notes

This task is intentionally placed before Task 6 because Task 6 will make task data more dynamic. Once the LangGraph pipeline and worker are added, the UI will need to observe server-side changes such as:

- task status changing from `queued` to `processing`
- result JSON appearing after generation
- output ZIP path becoming available
- corrections triggering regenerated output

TanStack Query is the appropriate tool for this kind of data because it treats API responses as cached server state. React `useState` remains useful, but only for state that truly belongs to the current browser interaction.

In Next.js App Router terms:

- Server Components can fetch data directly on the server.
- Client Components are used for interaction.
- TanStack Query is useful when a Client Component needs live, refreshable server data.
- A Query provider must live in a Client Component boundary.

---

## Acceptance Criteria

- Task detail page no longer manually loads task server data with `useEffect`.
- Task detail server data is loaded through TanStack Query.
- Task-detail and task-file API contracts are represented by shared Zod schemas with inferred DTO types.
- Client fetch helpers validate JSON responses before returning data to TanStack Query.
- Results tab loads jobs source data on first render when a jobs file exists.
- Files tab and Results tab share the same file-content query key strategy.
- CSV parsing is not duplicated between `JobsSourceDataView` and `FilesTab`.
- Mutations invalidate relevant task queries instead of manually refreshing partial local state.
- Local `useState` remains only for local UI state such as active tab and correction text.
