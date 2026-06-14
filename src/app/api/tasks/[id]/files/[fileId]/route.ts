import { NextRequest, NextResponse } from 'next/server';
import { getGlobalDataSource } from '@/lib/db/dataSource';
import { TaskFile } from '@/lib/db/entities/TaskFile';
import { join } from 'path';
import { readFile } from 'fs/promises';

/**
 * @swagger
 * /api/tasks/{id}/files/{fileId}:
 *   get:
 *     summary: Get CSV file content parsed as JSON
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
 *         description: Parsed CSV content
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

    const uploadDir = process.env.DATA_DIR;
    if (!uploadDir) {
      return NextResponse.json(
        { error: 'DATA_DIR environment variable is not set' },
        { status: 500 },
      );
    }

    const diskPath = join(uploadDir, taskFile.fileName);

    const content = await readFile(diskPath, 'utf-8');

    // Simple CSV parser
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Parse headers, handling quotes and potential commas in quotes
    const parseLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map((val) => val.replace(/^"|"$/g, ''));
    };

    const headers = parseLine(lines[0]);
    const data: Record<string, string>[] = lines.slice(1).map((line) => {
      const values = parseLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] ?? '';
      });
      return obj;
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching file content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 },
    );
  }
}
