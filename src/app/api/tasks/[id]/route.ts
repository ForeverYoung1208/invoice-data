import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/container';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskFile } from '@/lib/db/entities/TaskFile';
import { TaskResult } from '@/lib/db/entities/TaskResult';
import { CorrectionLog } from '@/lib/db/entities/CorrectionLog';

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task details with files, results, and corrections
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Task deleted
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update task status, instructions, or add a correction
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               errorMessage:
 *                 type: string
 *               instructions:
 *                 type: string
 *               correction:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const task = await taskService.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const ds = await getGlobalDataSource();
    const taskFileRepo = ds.getRepository(TaskFile);
    const taskResultRepo = ds.getRepository(TaskResult);
    const correctionLogRepo = ds.getRepository(CorrectionLog);

    const [files, results, corrections] = await Promise.all([
      taskFileRepo.find({ where: { taskId: task.id } }),
      taskResultRepo.find({ where: { taskId: task.id } }),
      correctionLogRepo.find({
        where: { taskId: task.id },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return NextResponse.json(
      {
        id: task.id,
        status: task.status,
        instructions: task.instructions ?? null,
        errorMessage: task.errorMessage ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        files: files.map((f) => ({
          id: f.id,
          role: f.role,
          filePath: f.filePath,
          originalName: f.originalName,
          createdAt: f.createdAt.toISOString(),
        })),
        results: results.map((r) => ({
          id: r.id,
          resultJson: r.resultJson,
          zipPath: r.zipPath ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
        corrections: corrections.map((c) => ({
          id: c.id,
          message: c.message,
          resultSnapshotBefore: c.resultSnapshotBefore,
          createdAt: c.createdAt.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const task = await taskService.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 1. Handle correction if provided
    if (body.correction) {
      await taskService.addCorrection(id, body.correction);
    }

    // 2. Handle status update if provided
    if (body.status) {
      await taskService.updateStatus(id, body.status, body.errorMessage);
    }

    // 3. Handle instructions update if provided
    if (body.instructions !== undefined) {
      await taskService.updateInstructions(id, body.instructions);
    }

    return NextResponse.json({ message: 'Task updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const task = await taskService.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await taskService.delete(id);

    return NextResponse.json({ message: 'Task deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 },
    );
  }
}
