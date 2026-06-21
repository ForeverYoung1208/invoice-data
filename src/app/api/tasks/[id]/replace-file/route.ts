import { NextRequest, NextResponse } from 'next/server';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskFile } from '@/lib/db/entities/TaskFile';
import { configService } from '@/lib/container';
import { ETaskFileRole } from '@/lib/constants';
import { writeFile, unlink, access } from 'fs/promises';
import { join } from 'path';

/**
 * @swagger
 * /api/tasks/{id}/replace-file:
 *   post:
 *     summary: Replace an input file for a task (re-upload)
 *     description: Replaces the existing file for the given role on disk and in the DB record.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [role, file]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [jobs, clients, parts, devices]
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File replaced successfully
 *       400:
 *         description: Missing role or file
 *       404:
 *         description: Task file record not found
 *       500:
 *         description: Internal server error
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: taskId } = await params;
    const formData = await req.formData();

    const role = formData.get('role') as string | null;
    const file = formData.get('file') as File | null;

    if (!role || !file) {
      return NextResponse.json(
        { error: 'role and file are required' },
        { status: 400 },
      );
    }

    if (!Object.values(ETaskFileRole).includes(role as ETaskFileRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const ds = await getGlobalDataSource();
    const taskFileRepo = ds.getRepository(TaskFile);

    const existing = await taskFileRepo.findOne({
      where: { taskId, role: role as ETaskFileRole },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `No file with role "${role}" found for this task` },
        { status: 404 },
      );
    }

    const { dataDir } = configService.getConfig();

    // Delete old file from disk (best-effort)
    const oldPath = join(dataDir, existing.fileName);
    try {
      await access(oldPath);
      await unlink(oldPath);
    } catch {
      // file not on disk — ignore
    }

    // Save new file
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const newFileName = `${taskId}_${role}_${timestamp}.${ext}`;
    await writeFile(
      join(dataDir, newFileName),
      Buffer.from(await file.arrayBuffer()),
    );

    // Update DB record
    await taskFileRepo.update(existing.id, {
      fileName: newFileName,
      originalName: file.name,
    });

    return NextResponse.json({
      id: existing.id,
      role,
      originalName: file.name,
    });
  } catch (error) {
    console.error('Error replacing file:', error);
    return NextResponse.json(
      { error: 'Failed to replace file' },
      { status: 500 },
    );
  }
}
