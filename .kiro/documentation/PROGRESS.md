# Implementation Task Tracker

**Total estimate: ~36 hours**
**Completed: ~72**

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

### 5.A. Refactor task-detail UI data flow with TanStack Query
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


### 8.A. Bug fixes and refactoring
- **Estimate:** 4h
- **Notes:** DataSource init race fix, MatchPartsNode prompt improvements, completed job status filtering, worker debug setup
- **Status:** Completed. Spent: 4h

### 9. Review UI
- **Estimate:** 4h
- **Notes:** Results table, flags highlighting, download, correction panel, status polling; Needs additional review after correction node implementation.
- **Status:** Completed. Spent: 4h


### 10. Correction node in LangGraph
- **Estimate:** 3h
- **Notes:** CorrectionNode, LLM prompt, result JSON update, unit tests
- **Status:** Completed. Spent: 6h

### 11. Task lifecycle & archive
- **Estimate:** 2h
- **Notes:** Complete/archive/delete, Archive tab, read-only view

### 11.A. Review UI
- **Estimate:** 4h
- **Notes:** additional UI review after finishing all tasks 
- **Status:** Completed. Spent: 5h

### 11.B. Fix taskRef property
- **Estimate:** 3h
- **Notes:** Fix taskRef property in task detail page
- **Status:** Completed. Spent: 1h

### 12. Deployment, CICD
- **Estimate:** 27h
- **Notes:** Docker, Docker Compose, CI/CD pipeline, deployment scripts
- **Status:** in progress (aws dev deployment completed. still need to do dev deployment and github actions workflow to deploy updates). Spent: 18h

### 12.A. Add swap file for t3.small instances
- **Estimate:** 1h
- **Notes:** Add 4GB swap file to prevent OOM on small instances. Currently t3.medium (3.7GB RAM) is used, but swap would allow using t3.small (2GB). Also need to increase EBS volume size from 8GB to at least 10GB.
- **Status:** Completed. Spent: 3h

### 13. Download source files from task Files tab
- **Estimate:** 1h
- **Notes:** Add download button to Files tab in task detail page. Users need ability to download original CSV files that were uploaded. Need to create an API endpoint to serve the raw file for download.
- **Status:** Completed. Spent: 0.5h
