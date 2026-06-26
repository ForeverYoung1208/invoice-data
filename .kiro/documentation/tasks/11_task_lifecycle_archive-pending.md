### Task 11: Task lifecycle & completed state

- **Objective:** Tasks that are completed should be read-only; they can be returned to review (for corrections), or deleted.
- **Implementation:**
  - Server Actions:  `deleteTask(taskId)` removes DB record + all files from disk (input CSVs + ZIP); `returnToReview(taskId)` sets status `review`
  - Dashboard page: no changes — all tasks listed with their status badge as usual.
  - Task detail page: when status is `completed` — hide correction form and re-upload panel; replace "Approve" + "Re-run" footer buttons with "Return to Review"; keep "Delete" button.
- **Demo:** Mark task complete → correction/process controls hidden, "Return to Review" appears; clicking it sends task back to review state; "Delete" removes task and all files from disk.

---

### Subtasks

**11.1 — `TaskService.deleteWithFiles(taskId)`**
Add method to `TaskService` that fetches all `TaskFile` records + latest `TaskResult`, deletes physical files from disk (input CSVs + ZIP), then deletes the DB record (cascade handles relations).

**11.2 — API: `POST /api/tasks/[id]/return-to-review`**
`completeTask` already works via `PATCH /api/tasks/[id]` with `{ status: "completed" }` (used by the existing "Approve" button). Add only a new `POST /api/tasks/[id]/return-to-review` route handler that sets status back to `review`. Also extend `DELETE /api/tasks/[id]` to delete files from disk using the new `deleteWithFiles` method.

**11.3 — Wire new routes into `api-routes.ts`**
Add `complete` and `returnToReview` entries to `apiRoutes.tasks`.

**11.4 — Task detail page: conditional controls based on `completed` status**
In `task/[id]/page.tsx`: when `task.status === ETaskStatus.COMPLETED`, hide `CorrectionForm` and `ReuploadPanel`; update `TaskFooter` to show "Return to Review" button instead of "Approve" and "Re-run".
