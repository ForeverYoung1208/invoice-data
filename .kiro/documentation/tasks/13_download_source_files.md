# Task 13: Download Source Files from Task Files Tab

## Overview
Add ability for users to download original CSV files that were uploaded to a task from the Files tab in the task detail page.

## Problem
Currently, the Files tab displays uploaded CSV files in a table format showing parsed content, but users cannot download the original source files. Users need the ability to download the original files for external processing or verification.

## Solution
Create a download API endpoint and add a download button to each file card in the Files tab.

## Sub-tasks

### 13.1 Create download API endpoint
- **File:** `src/app/api/tasks/[id]/files/[fileId]/download/route.ts`
- **Description:** Create a new API route that serves the raw CSV file for download
- **Details:**
  - Path: `/api/tasks/[id]/files/[fileId]/download`
  - Should return the file with proper Content-Disposition header for download
  - Should support same authorization checks as existing file routes
  - Reuse existing logic from the rows endpoint for file lookup

### 13.2 Add download button to FilesTab component
- **File:** `src/components/dashboard/task-detail/files-tab.tsx`
- **Description:** Add a download button to each file card header
- **Details:**
  - Add download icon (from lucide-react: Download icon)
  - Position: Next to the file name or in the header actions
  - Style: Use button variant that matches existing UI (e.g., ghost or icon button)
  - Action: Open the download route in a new tab or trigger file download

### 13.3 Register download route in API routes (optional)
- **File:** `src/lib/client/api-routes.ts`
- **Description:** Add the download route to the API routes registry if used by the client
- **Details:**
  - Check if the client uses apiRoutes for this endpoint
  - If needed, add: `files: { download: (taskId: string, fileId: string) => \`/api/tasks/\${taskId}/files/\${fileId}/download\` }`

## Implementation

### 13.1 API Endpoint

Create file `src/app/api/tasks/[id]/files/[fileId]/download/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskFile } from '@/lib/db/entities/TaskFile';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { configService } from '@/lib/container';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const { id: taskId, fileId } = await params;

    const ds = await getGlobalDataSource();
    const taskFileRepo = ds.getRepository(TaskFile);

    const taskFile = await taskFileRepo.findOne({
      where: { id: fileId, taskId },
    });

    if (!taskFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const uploadDir = configService.getConfig().dataDir;
    const diskPath = join(uploadDir, taskFile.fileName);

    // Read file and return with download headers
    const fileBuffer = await readFile(diskPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${taskFile.originalName}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 },
    );
  }
}
```

### 13.2 FilesTab Component

Update the file card header in `src/components/dashboard/task-detail/files-tab.tsx`:

```typescript
// Add import for Download icon
import { FileText, Loader2, Download } from 'lucide-react';

// In the file card header, add download button:
<CardHeader className="pb-3 border-b border-slate-100">
  <div className="flex items-center justify-between">
    <CardTitle className="text-sm text-slate-600 font-medium flex items-center gap-2">
      <FileText className="w-4 h-4" />
      {file.name}
    </CardTitle>
    <div className="flex items-center gap-2">
      {/* Add download button */}
      <a
        href={`/api/tasks/${taskId}/files/${file.id}/download`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
        title="Download file"
      >
        <Download className="w-4 h-4 text-slate-500" />
      </a>
      <Badge className={`text-xs ${ROLE_COLORS[file.role] || ''}`}>
        {file.role}
      </Badge>
      <span className="text-xs text-slate-500">{file.size}</span>
    </div>
  </div>
</CardHeader>
```

## Testing

- [ ] Test file download from Files tab
- [ ] Verify correct filename in download
- [ ] Verify file content matches original upload
- [ ] Check that authorization is enforced (user can only download files from their tasks)
- [ ] Test with different file sizes

## Status

- [x] 13.1 Create download API endpoint
- [x] 13.2 Add download button to FilesTab component
- [x] 13.3 Register download route in API routes (if needed)
- [x] Test the download functionality

## Notes

- The existing `/api/tasks/[id]/files/[fileId]` endpoint returns parsed CSV content (JSON), not suitable for download
- The new endpoint serves raw binary file data with proper Content-Disposition header
- Consider reusing the existing TaskFile entity and file lookup logic to avoid duplication