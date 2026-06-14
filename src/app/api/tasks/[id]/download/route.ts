import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskResult } from '@/lib/db/entities/TaskResult';

/**
 * @swagger
 * /api/tasks/{id}/download:
 *   get:
 *     summary: Download the ZIP archive for a task result
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: ZIP file download
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Task result or file not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const ds = await getGlobalDataSource();
    const result = await ds
      .getRepository(TaskResult)
      .findOne({ where: { taskId: id }, order: { createdAt: 'DESC' } });

    if (!result?.zipPath) {
      return NextResponse.json(
        { error: 'No ZIP available for this task' },
        { status: 404 },
      );
    }

    if (!existsSync(result.zipPath)) {
      return NextResponse.json(
        { error: 'ZIP file not found on disk' },
        { status: 404 },
      );
    }

    const data = await readFile(result.zipPath);
    const fileName = basename(result.zipPath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading ZIP:', error);
    return NextResponse.json(
      { error: 'Failed to download ZIP' },
      { status: 500 },
    );
  }
}
