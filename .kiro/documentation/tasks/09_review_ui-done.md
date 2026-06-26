### Task 9: Review UI

- **Objective:** User reviews results, downloads ZIP, submits corrections
- **Implementation:** Task detail page (status=review): TanStack Table grouped by client, flagged rows highlighted (yellow = uncertain, orange = compatibility warning). REST: GET /api/tasks/[id]/download streams ZIP. Correction panel: shadcn Textarea + button → ~~POST /api/tasks/[id]/corrections~~ → saves to CorrectionLog, re-queues task. Re-upload panel replaces input file + re-queues. TanStack Query polls GET /api/tasks/[id] every 3s while processing
- **TODO:** The spec originally mentioned `POST /api/tasks/[id]/corrections` as a dedicated endpoint. In practice corrections are submitted via `PATCH /api/tasks/[id]` with a `correction` field. Reconsider whether a separate `/corrections` endpoint is needed — likely not, can be removed from the spec.
- **Status:** Completed. Spent: 4h