### Task 11.B: Fix `taskRef` property


- **Objective:** Add a persistable `taskRef` field to the task entity so users can assign and later reference a custom identifier (e.g. `"JOB-2026-05-05-001"`) when creating a task. The field is stored in the database, displayed in the task detail page, and visible in the task list tables.
- **Current state:** The upload page has a "Job Information" section with a `jobRef` text input and a `jobDate` date input. Both values are sent to `POST /api/tasks` via `formData.append()`, but the Task entity has no corresponding columns, so they are accepted by the route handler and returned in the response — but never persisted. The frontend does not capture the response values, so they are effectively dead code.

---

### Subtasks

**11.B.1 — Rename UI labels in upload page**
- In `src/app/dashboard/upload/page.tsx`: rename "Job Information" section title to "Task Information".
- Rename `jobRef` state variable to `taskRef` and update all references (`useState`, `setTaskRef`, `id="taskRef"`, label text "Task Reference").
- Rename `jobDate` state variable to `taskDate` and update all references (`useState`, `setTaskDate`, `id="taskDate"`, label text "Date").
- Update `formData.append('taskRef', taskRef)` and `formData.append('taskDate', taskDate)` calls.
- Keep the placeholder text `"JOB-2026-05-05-001"` as-is (it demonstrates the expected format).

**11.B.2 — Add `taskRef` and `taskDate` columns to Task entity**
- In `src/lib/db/entities/Task.ts`: add `@Column({ type: "text", nullable: true }) taskRef: string | null;` and `@Column({ type: "date", nullable: true }) taskDate: string | null;`.
- Both nullable to maintain backward compatibility with existing tasks.

**11.B.3 — Generate and apply migration**
- Run `npm run migration:generate -- -n AddTaskRefAndTaskDate` to produce the migration.
- Verify the migration adds `task_ref text` and `task_date date` columns (nullable) to the `tasks` table.
- Run `npm run migration:run` to apply it to the dev database.

**11.B.4 — Update TaskService to persist `taskRef` and `taskDate`**
- In `TaskService.create()`: accept `taskRef` and `taskDate` as optional parameters and pass them when creating the task entity (similar to how `updateInstructions` works).
- The `create()` method signature becomes `async create(taskRef?: string | null, taskDate?: string | null): Promise<Task>`.

**11.B.5 — Update `POST /api/tasks` route handler**
- In `src/app/api/tasks/route.ts`: read `taskRef` and `taskDate` from `formData` (rename the variable reads from `jobRef`/`jobDate`).
- Pass them to `taskService.create(taskRef, taskDate)`.
- Update the `@swagger` JSDoc annotation: rename `jobRef` → `taskRef`, add `taskDate` field description.
- Update the response to include `taskRef` and `taskDate` in the JSON payload.

**11.B.6 — Update Zod schemas (`task.schema.ts`)**
- In `taskCreatedSchema` (API→UI): add `taskRef: z.string().nullable()` and `taskDate: z.string().nullable()`.
- In `taskListItemSchema` (API→UI): add `taskRef: z.string().nullable()` and `taskDate: z.string().nullable()`.
- In `taskDetailSchema` (API→UI): add `taskRef: z.string().nullable()` and `taskDate: z.string().nullable()`.
- All DTO types (`TTaskCreatedDto`, `TTaskListItemDto`, `TTaskDetailDto`) will be inferred automatically.

**11.B.7 — Update `TTaskUpdateDto` in `taskUpdateSchema`**
- Ensure the schema already supports `taskRef` and `taskDate` via the `.partial()` extension, or add them explicitly if needed.

**11.B.8 — Display `taskRef` in task list tables (dashboard page)**
- In `src/app/dashboard/page.tsx`: add a "Reference" column to both Active and Completed task tables between "Task ID" and "Status".
- Display `task.taskRef || '—'` (or empty string if null).
- Update `colSpan={5}` → `colSpan={6}` in the loading and empty-state rows to match the new column count.

**11.B.9 — Display `taskRef` and `taskDate` in task detail page (task/[id]/page.tsx)**
- In `src/app/dashboard/task/[id]/page.tsx`: display `taskRef` and `taskDate` in the `TaskHeader` component (or wherever task metadata is shown) so users can see the reference when viewing/editing a task.
- If `TaskHeader` is a shared component, pass `taskRef` and `taskDate` as props.

**11.B.10 — Update existing DB records (seed / null)**
- Since both columns are nullable, no data migration is required. Existing tasks will simply show `—` for the reference field.
