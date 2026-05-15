### Task 3: Task management UI & API

- **Objective:** User can create tasks, upload 4 xlsx files with instructions, and see task list
- **Implementation:** TaskService class (TypeORM repository, registered in container). REST: POST /api/tasks, POST /api/tasks/[id]/files (multipart, saves to /data/tasks/<id>/input/). Server Actions: saveInstructions(taskId, instructions). Home page: shadcn Table with status Badge. Task detail page: 4 labeled file inputs + instructions textarea
- **Demo:** Create task → upload 4 files → task appears in list with status uploaded