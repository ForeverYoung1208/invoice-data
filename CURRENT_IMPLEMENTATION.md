# Current Implementation Guide: Task 5.1 TanStack Query Refactor

Goal: refactor task-detail UI data flow before Task 6 so server data is owned by TanStack Query instead of scattered `useEffect`/`useState` logic.

Task document: `.kiro/documentation/tasks/05_1_refactor_UI_task_data_flow.md`

---

## Step 1: Add Query Provider

Create:

`src/components/providers/query-provider.tsx`

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

Then wrap `children` in:

`src/app/layout.tsx`

```tsx
import { QueryProvider } from '@/components/providers/query-provider';
```

```tsx
<body className="min-h-full flex flex-col">
  <QueryProvider>{children}</QueryProvider>
</body>
```

Why `useState`: one stable `QueryClient` instance per browser session, not a new one every render.

---

## Step 2: Create API Helpers

Create:

`src/lib/client/task-detail-api.ts`

```ts
export interface TaskFileDto {
  id: string;
  role: string;
  originalName: string;
  filePath: string;
}

export interface CorrectionDto {
  id: string;
  message: string;
  createdAt: string;
}

export interface TaskDetailDto {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  instructions: string | null;
  files: TaskFileDto[];
  results: { id: string; resultJson: unknown; zipPath: string | null }[];
  corrections: CorrectionDto[];
}

export type CsvRow = Record<string, string>;

export async function fetchTaskDetail(taskId: string): Promise<TaskDetailDto> {
  const res = await fetch(`/api/tasks/${taskId}`);

  if (!res.ok) {
    throw new Error('Failed to fetch task');
  }

  return res.json();
}

export async function fetchTaskFileRows(
  taskId: string,
  fileId: string,
): Promise<CsvRow[]> {
  const res = await fetch(`/api/tasks/${taskId}/files/${fileId}`);

  if (!res.ok) {
    throw new Error('Failed to fetch task file');
  }

  return res.json();
}
```

Important: helpers should throw on bad response. TanStack Query uses thrown errors to set `isError`.

---

## Step 3: Refactor Page Query Only

In:

`src/app/dashboard/task/[id]/page.tsx`

Replace task-loading `useEffect` with:

```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchTaskDetail } from '@/lib/client/task-detail-api';
```

```tsx
const {
  data,
  isLoading,
  isError,
  error,
} = useQuery({
  queryKey: ['task', taskId],
  queryFn: () => fetchTaskDetail(taskId),
});
```

Then derive values instead of storing them:

```tsx
const task = data
  ? {
      id: data.id,
      status: data.status,
      createdAt: new Date(data.createdAt).toLocaleString('uk-UA'),
      updatedAt: new Date(data.updatedAt).toLocaleString('uk-UA'),
    }
  : null;

const files =
  data?.files.map((f) => ({
    id: f.id,
    name: f.originalName,
    role: f.role,
    size: `${(f.filePath || '').split('/').pop() || '—'}`,
  })) ?? [];

const corrections =
  data?.corrections.map((c) => ({
    id: c.id,
    message: c.message,
    createdAt: new Date(c.createdAt).toLocaleString('uk-UA'),
  })) ?? [];

const latestResult =
  data?.results && data.results.length > 0 ? data.results[0] : null;

const result = latestResult?.resultJson ?? null;
```

Keep these as `useState`:

```tsx
const [correctionText, setCorrectionText] = useState('');
const [activeTab, setActiveTab] = useState('results');
```

Remove these local server-data states:

```tsx
task
result
files
corrections
loading
error
```

---

## Step 4: Convert Loading/Error Rendering

Replace:

```tsx
if (loading) ...
if (error) ...
```

with:

```tsx
if (isLoading) ...
if (isError) ...
```

For the error message:

```tsx
const message = error instanceof Error ? error.message : 'Failed to load task';
```

At this point, stop and test manually. The page should behave the same as before.

---

## Step 5: Refactor `JobsSourceDataView`

Change props:

```ts
interface JobsSourceDataViewProps {
  taskId: string;
  fileId: string;
}
```

Use query:

```tsx
const { data = [], isLoading, isError, error } = useQuery({
  queryKey: ['task-file', taskId, fileId],
  queryFn: () => fetchTaskFileRows(taskId, fileId),
});
```

Then delete local:

```tsx
data
loading
error
useEffect
parseCSV
```

Update page usage:

```tsx
<JobsSourceDataView taskId={taskId} fileId={jobsFile.id} />
```

Now the Results tab owns its own query, but the data is cached globally by TanStack Query.

---

## Step 6: Refactor `FilesTab`

Pass `taskId`:

```tsx
<FilesTab taskId={taskId} files={files} />
```

Inside `FilesTab`, use `useQueries`:

```tsx
const fileQueries = useQueries({
  queries: files.map((file) => ({
    queryKey: ['task-file', taskId, file.id],
    queryFn: () => fetchTaskFileRows(taskId, file.id),
  })),
});
```

When rendering each file:

```tsx
const query = fileQueries[index];
const rows = query.data ?? [];
```

Then render per-file loading/error from:

```tsx
query.isLoading
query.isError
query.error
```

Delete local `contents`, `loading`, `errors`, `useEffect`, and duplicated `parseCSV`.

---

## Step 7: Convert Mutations

For correction submission:

```tsx
const queryClient = useQueryClient();

const correctionMutation = useMutation({
  mutationFn: async (message: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correction: message }),
    });

    if (!res.ok) {
      throw new Error('Failed to submit correction');
    }
  },
  onSuccess: async () => {
    setCorrectionText('');
    await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  },
});
```

Then:

```tsx
const handleSubmitCorrection = async () => {
  if (!correctionText.trim()) return;
  correctionMutation.mutate(correctionText);
};
```

Do similar for approve/re-run: mutate, then invalidate `['task', taskId]`.

---

## Step 8: Manual Checks

Verify in browser:

- open task detail directly
- Results tab shows jobs source data immediately
- switch to Files
- switch back to Results
- no behavior depends on tab order
- submit correction
- corrections count updates
- approve/re-run updates status

Main learning goal: after Step 3, notice how the page becomes mostly “derive UI from `data`.” After Steps 5–6, notice how two different components can request the same file and TanStack Query makes the cache the shared owner.
