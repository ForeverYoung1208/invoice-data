# Implementation Task Tracker

**Total estimate: ~36 hours**
**Completed: ~43h**

---

### 1. Project scaffold, Docker, DB schema, DI container
- **Estimate:** 3h
- **Notes:** Next.js init, TypeORM entities, migrations, Docker Compose, `/api/health`
- **Status:** Completed. Spent: 2h

### 2. Authentication
- **Estimate:** 2h
- **Notes:** next-auth v5, login page, middleware, seed script
- **Status:** Completed. Spent: 1h. Note: Next.js 16 uses proxy.ts instead of middleware.ts

### 3. Task management UI & API
- **Estimate:** 4h
- **Status:** Completed. Spent: 6h

### 4. CSV parsing layer
- **Estimate:** 3h
- **Status:** Completed. Spent: 1.5h

### 5. LLM adapter
- **Estimate:** 2h
- **Status:** Completed. Spent: 1.5h

### 5.1. Refactor task-detail UI data flow with TanStack Query
- **Estimate:** 0h (unexpected refactoring)
- **Notes:** Refactored task-detail UI to use TanStack Query for data fetching and caching, used as next.js and tanStack learning material;
- **Status:** Completed. Spent: 8h

### 6. LangGraph agent — core pipeline
- **Estimate:** 6h
- **Notes:** StateGraph, 4 node classes, edges, integration test — most complex task
- **Status:** Completed. Total spent: 15h (6.1: 2h, 6.2: 1h, 6.2.1: 0.5h, 6.3: 3h, 6.4: 4h, 6.5: 1h, 6.6: 2h, 6.7: 0.5h, 6.8: 1h)

### 7. CSV output generation
- **Estimate:** 4h
- **Notes:** TotalSheetBuilder, ClientCSVWriter, OutputZipper, unit tests.
- **Status:** Completed. Spent: 4h

### 8. Background worker wiring
- **Estimate:** 3h
- **Notes:** WorkerService, polling loop, status transitions, concurrently setup
- **Status:** Completed. Spent: 0.5h
  Task 8 implementation:
  
  8.1. Fix the worker SELECT FOR UPDATE query (it's currently broken — queries tasks
   table but uses entity class name)
  8.2. Wire in InvoiceAgent into WorkerService
  8.3. Add POST /api/tasks/[id]/process route that sets status to queued
  8.4. Add process to apiRoutes


### 8.1. Bug fixes and refactoring
- **Estimate:** 4h
- **Notes:** DataSource init race fix, MatchPartsNode prompt improvements, completed job status filtering, worker debug setup
- **Status:** IN PROGRESS. Spent: 4h

### 9. Review UI
- **Estimate:** 4h
- **Notes:** Results table, flags highlighting, download, correction panel, status polling

### 10. Correction node in LangGraph
- **Estimate:** 3h
- **Notes:** CorrectionNode, LLM prompt, result JSON update, unit tests

### 11. Task lifecycle & archive
- **Estimate:** 2h
- **Notes:** Complete/archive/delete, Archive tab, read-only view
