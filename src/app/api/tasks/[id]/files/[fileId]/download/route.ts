import { NextRequest, NextResponse } from 'next/server';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskFile } from '@/lib/db/entities/TaskFile';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { configService } from '@/lib/container';

/**
 * @swagger
 * /api/tasks/{id}/files/{fileId}/download:
 *   get:
 *     summary: Download raw CSV file
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Raw CSV file for download
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 */
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