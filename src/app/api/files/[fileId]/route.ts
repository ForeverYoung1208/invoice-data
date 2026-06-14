import { NextRequest, NextResponse } from 'next/server';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskFile } from '@/lib/db/entities/TaskFile';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

/**
 * @swagger
 * /api/files/{fileId}:
 *   get:
 *     summary: Get file content as text
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File content
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;

    const ds = await getGlobalDataSource();
    const taskFileRepo = ds.getRepository(TaskFile);

    const taskFile = await taskFileRepo.findOne({ where: { id: fileId } });

    if (!taskFile) {
      return NextResponse.json(
        { error: 'File record not found' },
        { status: 404 },
      );
    }

    // The filePath in DB is like "/uploads/filename.csv"
    // We need to map this to the actual location in DATA_DIR
    const uploadDir = process.env.DATA_DIR;
    if (!uploadDir) {
      return NextResponse.json({ error: 'DATA_DIR not set' }, { status: 500 });
    }

    // Extract the filename part from the filePath (stripping /uploads/)
    const fileName = taskFile.fileName.split('/').pop();
    if (!fileName) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const absolutePath = join(uploadDir, fileName);

    if (!existsSync(absolutePath)) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 },
      );
    }

    const content = await readFile(absolutePath, 'utf-8');

    return NextResponse.json({ content }, { status: 200 });
  } catch (error) {
    console.error('Error fetching file content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 },
    );
  }
}
