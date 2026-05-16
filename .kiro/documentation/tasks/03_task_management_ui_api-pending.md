### Task 3: Task Management UI & API

- **Objective:** User can create tasks, upload 4 CSV files with instructions, and see task list
- **Implementation:** TaskService class (TypeORM repository, registered in container). REST: POST /api/tasks, POST /api/tasks/[id]/files (multipart, saves to /data/tasks/<id>/input/). Server Actions: saveInstructions(taskId, instructions). Home page: shadcn Table with status Badge. Task detail page: 4 labeled file inputs + instructions textarea
- **Demo:** Create task → upload 4 files → task appears in list with status uploaded

---

## Decomposition

### What already exists ✅
| Component | Status |
|-----------|--------|
| `TaskService` | ✅ Already implemented (create, findAll, findById, updateStatus, updateInstructions, delete) |
| `POST /api/tasks` | ✅ Already implemented (creates task + uploads files) |
| `/dashboard` (Task List) | ✅ UI exists — but uses **mock data** |
| `/dashboard/upload` (File Upload) | ✅ UI exists — calls real `/api/tasks` |
| `/dashboard/task/[id]` (Detail) | ✅ UI exists — but uses **mock data** |
| shadcn Table, Badge, Card, Tabs | ✅ All UI components available |

### Implementation Steps 🔧
| # | Step | Details |
|---|------|---------|
| **3.1** | **Create `GET /api/tasks` endpoint** | Returns list of tasks with status, filesCount, createdAt |
| **3.2** | **Connect Task List to real API** | Replace `MOCK_TASKS` with `GET /api/tasks` call |
| **3.3** | **Create `GET /api/tasks/[id]` endpoint** | Returns full task with files, results, corrections |
| **3.4** | **Connect Task Detail to real API** | Replace all mock data with `GET /api/tasks/[id]` call |
| **3.5** | **Create `DELETE /api/tasks/[id]` endpoint** | For task deletion from the detail page |
| **3.6** | **Verify upload with mock files** | Test upload works with our `.csv` mock data |
