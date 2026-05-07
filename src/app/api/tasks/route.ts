import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/container';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskFile } from '@/lib/db/entities/TaskFile';
import { TaskFileRole } from '@/lib/db/enums';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task with file uploads
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jobRef:
 *                 type: string
 *                 description: Job reference number
 *               jobDate:
 *                 type: string
 *                 format: date
 *                 description: Job date
 *               instructions:
 *                 type: string
 *                 description: Custom instructions for the job
 *               jobs:
 *                 type: string
 *                 format: binary
 *                 description: Jobs CSV file
 *               clients:
 *                 type: string
 *                 format: binary
 *                 description: Clients CSV file
 *               parts:
 *                 type: string
 *                 format: binary
 *                 description: Parts CSV file (optional)
 *               devices:
 *                 type: string
 *                 format: binary
 *                 description: Devices CSV file (optional)
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Bad request - missing required files
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const jobRef = formData.get('jobRef') as string | null;
    const jobDate = formData.get('jobDate') as string | null;
    const instructions = formData.get('instructions') as string | null;

    const jobsFile = formData.get('jobs') as File | null;
    const clientsFile = formData.get('clients') as File | null;
    const partsFile = formData.get('parts') as File | null;
    const devicesFile = formData.get('devices') as File | null;

    // Validate required files
    if (!jobsFile || !clientsFile) {
      return NextResponse.json(
        { error: 'Jobs and Clients files are required' },
        { status: 400 },
      );
    }

    // Create task
    const task = await taskService.create();

    // Update task with instructions if provided
    if (instructions) {
      await taskService.updateInstructions(task.id, instructions);
    }

    // Save files
    const ds = await getGlobalDataSource();
    const taskFileRepo = ds.getRepository(TaskFile);

    const uploadDir = process.env.UPLOAD_DIR;

    if (!uploadDir) {
      return NextResponse.json(
        { error: 'UPLOAD_DIR environment variable is not set' },
        { status: 500 },
      );
    }

    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filesToSave = [
      { file: jobsFile, role: TaskFileRole.JOBS },
      { file: clientsFile, role: TaskFileRole.CLIENTS },
      { file: partsFile, role: TaskFileRole.PARTS },
      { file: devicesFile, role: TaskFileRole.DEVICES },
    ];

    for (const { file, role } of filesToSave) {
      if (file) {
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const safeRole = role.replace(/[^a-z0-9]/gi, '_');
        const fileName = `${task.id}_${safeRole}_${timestamp}.${extension}`;
        const filePath = join(uploadDir, fileName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        await writeFile(filePath, buffer);

        const taskFile = taskFileRepo.create({
          task,
          taskId: task.id,
          role,
          filePath: `/uploads/${fileName}`,
          originalName: file.name,
        });

        await taskFileRepo.save(taskFile);
      }
    }

    return NextResponse.json(
      {
        id: task.id,
        status: task.status,
        jobRef,
        jobDate,
        instructions,
        filesCount: filesToSave.filter((f) => f.file).length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 },
    );
  }
}
