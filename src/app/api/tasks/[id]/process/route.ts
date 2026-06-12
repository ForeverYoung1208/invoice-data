import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/container';
import { ETaskStatus } from '@/lib/constants';

/**
 * @swagger
 * /api/tasks/{id}/process:
 *   post:
 *     summary: Queue a task for processing
 *     description: Sets task status to queued so the background worker picks it up
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task queued
 *       404:
 *         description: Task not found
 *       409:
 *         description: Task is not in a queueable state
 *       500:
 *         description: Internal server error
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const task = await taskService.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const queueableStatuses: ETaskStatus[] = [
      ETaskStatus.UPLOADED,
      ETaskStatus.FAILED,
      ETaskStatus.REVIEW,
    ];
    if (!queueableStatuses.includes(task.status)) {
      return NextResponse.json(
        { error: `Task cannot be queued from status: ${task.status}` },
        { status: 409 },
      );
    }

    await taskService.updateStatus(id, ETaskStatus.QUEUED);

    return NextResponse.json({ id, status: ETaskStatus.QUEUED });
  } catch (error) {
    console.error('Error queuing task:', error);
    return NextResponse.json(
      { error: 'Failed to queue task' },
      { status: 500 },
    );
  }
}
