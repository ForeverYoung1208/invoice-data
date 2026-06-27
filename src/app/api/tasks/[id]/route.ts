import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/container';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskFile } from '@/lib/db/entities/TaskFile';
import { TaskResult } from '@/lib/db/entities/TaskResult';
import { CorrectionLog } from '@/lib/db/entities/CorrectionLog';
import { idSchema, TId } from '@/lib/contracts/schemas/common.schema';
import { ETaskStatus } from '@/lib/constants';
import {
  taskDetailSchema,
  taskUpdateSchema,
  TTaskDetailDto,
} from '../../../../lib/contracts/schemas/task.schema';

const INSTRUCTIONS_EDITABLE_STATUSES = new Set<ETaskStatus>([
  ETaskStatus.UPLOADED,
  ETaskStatus.REVIEW,
]);

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
): Promise<NextResponse> {
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

    const [files, result, corrections] = await Promise.all([
      taskFileRepo.find({ where: { taskId: task.id } }),
      taskResultRepo.findOne({
        where: { taskId: task.id },
        order: { createdAt: 'DESC' },
      }),
      correctionLogRepo.find({
        where: { taskId: task.id },
        order: { createdAt: 'DESC' },
      }),
    ]);
    const results = result ? [result] : [];

    const taskDetail: TTaskDetailDto = {
      id: task.id,
      status: task.status,
      taskRef: task.taskRef ?? null,
      taskDate: task.taskDate ?? null,
      instructions: task.instructions ?? null,
      errorMessage: task.errorMessage ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      files: files.map((f) => ({
        id: f.id,
        role: f.role,
        filePath: f.fileName,
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
        resultSnapshotBefore: c.resultSnapshotBefore ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(taskDetailSchema.parse(taskDetail), {
      status: 200,
    });
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
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = taskUpdateSchema.parse(await req.json());

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
      if (!INSTRUCTIONS_EDITABLE_STATUSES.has(task.status)) {
        return NextResponse.json(
          {
            error: `Task-wide instructions cannot be edited from status: ${task.status}`,
          },
          { status: 409 },
        );
      }

      const instructions = body.instructions?.trim() || null;
      await taskService.updateInstructions(id, instructions);
    }

    const response: TId = { id };
    return NextResponse.json(idSchema.parse(response), { status: 200 });
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
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const task = await taskService.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await taskService.deleteWithFiles(id);

    const response: TId = { id };
    return NextResponse.json(idSchema.parse(response), { status: 200 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 },
    );
  }
}
