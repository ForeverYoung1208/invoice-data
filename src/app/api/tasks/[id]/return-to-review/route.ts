import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/container';
import { ETaskStatus } from '@/lib/constants';
import { idSchema } from '@/lib/contracts/schemas/common.schema';

/**
 * @swagger
 * /api/tasks/{id}/return-to-review:
 *   post:
 *     summary: Return a completed task back to review state
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task returned to review
 *       404:
 *         description: Task not found
 *       409:
 *         description: Task is not in completed state
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

    if (task.status !== ETaskStatus.COMPLETED) {
      return NextResponse.json(
        { error: `Task cannot be returned to review from status: ${task.status}` },
        { status: 409 },
      );
    }

    await taskService.updateStatus(id, ETaskStatus.REVIEW);

    return NextResponse.json(idSchema.parse({ id }));
  } catch (error) {
    console.error('Error returning task to review:', error);
    return NextResponse.json(
      { error: 'Failed to return task to review' },
      { status: 500 },
    );
  }
}
