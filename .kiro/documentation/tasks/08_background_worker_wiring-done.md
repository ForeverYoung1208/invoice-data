### Task 8: Background worker wiring — DONE

- **Objective:** Worker process picks up queued tasks and runs the LangGraph agent
- **Implementation:** WorkerService class in worker/index.ts — uses container to get InvoiceAgent + TaskService; polls tasks WHERE status='queued' every 5s with SELECT FOR UPDATE SKIP LOCKED; updates status processing → review or failed with error stored. Run via concurrently in npm scripts. REST: POST /api/tasks/[id]/process sets status to queued
- **Demo:** Upload files → click "Process" → status cycles to review within ~30s