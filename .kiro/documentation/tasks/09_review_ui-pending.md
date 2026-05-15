### Task 9: Review UI

- **Objective:** User reviews results, downloads ZIP, submits corrections
- **Implementation:** Task detail page (status=review): TanStack Table grouped by client, flagged rows highlighted (yellow = uncertain, orange = compatibility warning). REST: GET /api/tasks/[id]/download streams ZIP. Correction panel: shadcn Textarea + button → POST /api/tasks/[id]/corrections → saves to CorrectionLog, re-queues task. Re-upload panel replaces input file + re-queues. TanStack Query polls GET /api/tasks/[id] every 3s while processing
- **Demo:** Result table shows flags; correction re-triggers processing; status updates live in UI