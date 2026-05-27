# Implementation Task Tracker

**Total estimate: ~36 hours**
**Completed: ~11h**

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
- **Notes:** Completed. Spent: 6h

### 4. CSV parsing layer
- **Estimate:** 3h
- **Notes:** Completed. Spent: 1.5h

### 5. LLM adapter
- **Estimate:** 2h
- **Notes:** Completed. Spent: 1.5h

### 6. LangGraph agent — core pipeline
- **Estimate:** 6h
- **Notes:** StateGraph, 4 node classes, edges, integration test — most complex task

### 7. CSV output generation
- **Estimate:** 4h
- **Notes:** TotalSheetBuilder, ClientCSVWriter, OutputZipper, unit tests.
- **Status:** Needs Review. Fixed line-items insertion order (notes row shift bug) and added flags/warnings column to line items. All 19 tests passing.

### 8. Background worker wiring
- **Estimate:** 3h
- **Notes:** WorkerService, polling loop, status transitions, concurrently setup

### 9. Review UI
- **Estimate:** 4h
- **Notes:** Results table, flags highlighting, download, correction panel, status polling

### 10. Correction node in LangGraph
- **Estimate:** 3h
- **Notes:** CorrectionNode, LLM prompt, result JSON update, unit tests

### 11. Task lifecycle & archive
- **Estimate:** 2h
- **Notes:** Complete/archive/delete, Archive tab, read-only view
