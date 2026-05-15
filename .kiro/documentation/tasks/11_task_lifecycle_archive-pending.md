### Task 11: Task lifecycle & archive

- **Objective:** Completed tasks archived, browsable, manually deletable
- **Implementation:** Server Action completeTask(taskId) sets status completed. Home page: two shadcn Tabs — "Active" and "Archive". Completed tasks: read-only, show date/client count/download link. Server Action deleteTask(taskId): removes DB record + EBS files
- **Demo:** Complete task → moves to Archive tab; ZIP downloadable; delete removes from list and disk